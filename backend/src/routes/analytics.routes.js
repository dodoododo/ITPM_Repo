const express = require("express");
const mongoose = require("mongoose");
const { Task, Project } = require("../models");
const { verifyToken } = require("../middleware/auth.middleware");

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

const buildMatch = (query) => {
  const match = {};
  const startDate = getDateFilter(query.range || "month");

  match.createdAt = { $gte: startDate };

  if (query.projectId && query.projectId !== "all") {
    if (!mongoose.Types.ObjectId.isValid(query.projectId)) {
      throw new Error("Invalid projectId");
    }

    match.project_id = new mongoose.Types.ObjectId(query.projectId);
  }

  return match;
};

router.get("/summary", verifyToken, async (req, res) => {
  try {
    const match = buildMatch(req.query);
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
        todo: 0,
        overdue: 0,
        kpi: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/performance", verifyToken, async (req, res) => {
  try {
    const match = buildMatch(req.query);

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
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/projects", verifyToken, async (_req, res) => {
  try {
    const projects = await Project.find().select("name color status").sort({ createdAt: -1 });
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
