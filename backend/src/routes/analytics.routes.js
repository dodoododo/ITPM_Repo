const express = require("express");
const mongoose = require("mongoose");
const { Task, Project, Department } = require("../models");
const { verifyToken } = require("../middleware/auth.middleware");
const {
  canAccessTaskContent,
  getUserDepartmentIds,
  isManager,
} = require("../utils/rbac");

const router = express.Router();

const getDateFilter = (range) => {
  const now = new Date();
  if (range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
};

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const buildTaskProjectScopeFilter = async (user) => {
  const scope = [
    { owner_id: user.userId },
    { member_ids: user.userId },
  ];

  if (isManager(user)) {
    const departmentIds = await getUserDepartmentIds(Department, user.userId);
    scope.push({ department_id: { $in: departmentIds } });
  }

  return { $or: scope };
};

const getScopedProjectIds = async (user, projectId) => {
  if (projectId && projectId !== "all") {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw createHttpError("Invalid projectId", 400);
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw createHttpError("Project not found", 404);
    }

    const allowed = await canAccessTaskContent(user, project, Department);
    if (!allowed) {
      throw createHttpError("You do not have access to this project's analytics.", 403);
    }

    return [new mongoose.Types.ObjectId(projectId)];
  }

  const projects = await Project.find(await buildTaskProjectScopeFilter(user)).select("_id").lean();
  return projects.map((project) => project._id);
};

const buildMatch = async (query, user) => {
  const match = {};
  const startDate = getDateFilter(query.range || "month");

  match.createdAt = { $gte: startDate };
  match.project_id = { $in: await getScopedProjectIds(user, query.projectId) };

  return match;
};

router.get("/summary", verifyToken, async (req, res) => {
  try {
    const match = await buildMatch(req.query, req.user);
    const now = new Date();

    const [summary] = await Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          in_progress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
          review: { $sum: { $cond: [{ $eq: ["$status", "review"] }, 1, 0] } },
          needs_revision: { $sum: { $cond: [{ $eq: ["$status", "needs_revision"] }, 1, 0] } },
          todo: { $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "done"] },
                    { $ne: ["$due_date", null] },
                    { $lt: ["$due_date", now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          done: 1,
          in_progress: 1,
          review: 1,
          needs_revision: 1,
          todo: 1,
          overdue: 1,
          kpi: {
            $cond: [
              { $gt: ["$total", 0] },
              { $round: [{ $multiply: [{ $divide: ["$done", "$total"] }, 100] }, 0] },
              0,
            ],
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: summary || {
        total: 0,
        done: 0,
        in_progress: 0,
        review: 0,
        needs_revision: 0,
        todo: 0,
        overdue: 0,
        kpi: 0,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.get("/performance", verifyToken, async (req, res) => {
  try {
    const match = await buildMatch(req.query, req.user);

    const data = await Task.aggregate([
      { $match: { ...match, assignee_id: { $ne: null } } },
      {
        $group: {
          _id: "$assignee_id",
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          user_id: "$_id",
          full_name: "$user.full_name",
          email: "$user.email",
          avatar: "$user.avatar",
          total: 1,
          done: 1,
          completion_rate: {
            $cond: [
              { $gt: ["$total", 0] },
              { $round: [{ $multiply: [{ $divide: ["$done", "$total"] }, 100] }, 0] },
              0,
            ],
          },
        },
      },
      { $sort: { done: -1, completion_rate: -1 } },
    ]);

    res.json({ success: true, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.get("/projects", verifyToken, async (req, res) => {
  try {
    const filter = await buildTaskProjectScopeFilter(req.user);
    const projects = await Project.find(filter).select("name color status visibility").sort({ createdAt: -1 });
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
