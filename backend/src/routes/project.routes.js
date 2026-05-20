const express = require("express");
const { Project, Task, User, Department, ActivityLog } = require("../models");
const { verifyToken, requireRole } = require("../middleware/auth.middleware");
const { formatResponse, formatErrorResponse, createActivityLog } = require("../utils/apiHelpers");

const router = express.Router();

const populateProject = (query) =>
  query
    .populate("department_id", "name color")
    .populate("owner_id", "full_name email avatar role")
    .populate("member_ids", "full_name email avatar role isActive");

const getProjectWithMembers = (id) => populateProject(Project.findById(id));

router.get("/", verifyToken, async (req, res) => {
  try {
    const {
      status,
      department_id,
      page = 1,
      limit = 20,
    } = req.query;

    const numericPage = Math.max(Number(page) || 1, 1);
    const numericLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (numericPage - 1) * numericLimit;
    const filter = {};

    if (status && status !== "all") filter.status = status;
    if (department_id && department_id !== "all") filter.department_id = department_id;

    const [projects, total] = await Promise.all([
      populateProject(Project.find(filter))
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(numericLimit),
      Project.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: projects,
      pagination: {
        total,
        page: numericPage,
        limit: numericLimit,
        pages: Math.ceil(total / numericLimit),
      },
    });
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

router.get("/:id", verifyToken, async (req, res) => {
  try {
    const project = await getProjectWithMembers(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.json(formatResponse(true, project));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

router.post("/", verifyToken, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const {
      name,
      description = "",
      color = "#059669",
      status = "planning",
      progress = 0,
      start_date,
      end_date,
      department_id,
      owner_id,
      member_ids = [],
    } = req.body;

    if (!name || !owner_id) {
      return res.status(400).json({
        success: false,
        message: "name and owner_id are required",
      });
    }

    const [owner, department] = await Promise.all([
      User.findById(owner_id),
      department_id ? Department.findById(department_id) : null,
    ]);

    if (!owner) {
      return res.status(404).json({ success: false, message: "Owner not found" });
    }

    if (department_id && !department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    const uniqueMembers = [...new Set([owner_id, ...member_ids].filter(Boolean))];
    const project = await Project.create({
      name,
      description,
      color,
      status,
      progress,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      department_id: department_id || undefined,
      owner_id,
      member_ids: uniqueMembers,
    });

    await createActivityLog(
      ActivityLog,
      req.user.userId,
      "create_project",
      "Project",
      project._id,
      { name, owner_id, department_id }
    );

    res.status(201).json(formatResponse(true, await getProjectWithMembers(project._id), "Project created"));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

router.patch("/:id", verifyToken, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const allowedFields = ["name", "description", "color", "status", "progress", "start_date", "end_date", "department_id"];
    const updates = {};

    allowedFields.forEach((field) => {
      if (field in req.body) updates[field] = req.body[field] || undefined;
    });

    const project = await Project.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    res.json(formatResponse(true, await getProjectWithMembers(project._id), "Project updated"));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

router.patch("/:id/owner", verifyToken, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const { owner_id } = req.body;

    if (!owner_id) {
      return res.status(400).json({ success: false, message: "owner_id is required" });
    }

    const user = await User.findById(owner_id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Owner not found" });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    project.owner_id = owner_id;
    project.member_ids.addToSet(owner_id);
    await project.save();

    res.json(formatResponse(true, await getProjectWithMembers(project._id), "Project owner updated"));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

router.post("/:id/members", verifyToken, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "user_ids must be a non-empty array",
      });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { member_ids: { $each: user_ids } } },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    res.json(formatResponse(true, await getProjectWithMembers(project._id), "Members added"));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

router.delete("/:id/members/:userId", verifyToken, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const { id, userId } = req.params;
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (project.owner_id.toString() === userId) {
      return res.status(409).json({
        success: false,
        message: "Cannot remove the project owner. Assign another owner first.",
      });
    }

    const blockingTasks = await Task.find({
      project_id: id,
      assignee_id: userId,
      status: "in_progress",
    }).select("title status");

    if (blockingTasks.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot remove member while they have in-progress tasks.",
        data: { blockingTasks },
      });
    }

    await Project.findByIdAndUpdate(id, { $pull: { member_ids: userId } });
    res.json(formatResponse(true, await getProjectWithMembers(id), "Member removed"));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

module.exports = router;
