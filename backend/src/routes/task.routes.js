const express = require("express");
const { Task, Project, Comment, User, ActivityLog } = require("../models");
const { verifyToken } = require("../middleware/auth.middleware");
const { createNotification, createNotifications } = require("../utils/notifications");

const router = express.Router();

const allowedTaskFields = [
  "title",
  "content_html",
  "status",
  "priority",
  "start_date",
  "due_date",
  "assignee_id",
  "reviewer_id",
  "subtasks",
  "attachments",
  "execution_result",
];

const populateTask = (query) =>
  query
    .populate("project_id", "name color status")
    .populate("assignee_id", "full_name avatar email")
    .populate("reviewer_id", "full_name avatar email")
    .populate("created_by", "full_name avatar email");

const pickAllowed = (source, fields) => {
  const updates = {};
  fields.forEach((field) => {
    if (field in source) {
      updates[field] = source[field] === "" ? undefined : source[field];
    }
  });
  return updates;
};

const normalizeMentionKey = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const extractMentionedUsers = async (text) => {
  const tokens = [...new Set((text.match(/@([\p{L}\p{N}_.@-]+)/gu) || []).map((item) => item.slice(1)))];
  if (tokens.length === 0) return [];

  const users = await User.find().select("_id full_name email").lean();
  const tokenSet = new Set(tokens.map(normalizeMentionKey));

  return users.filter((user) => (
    tokenSet.has(user._id.toString().toLowerCase())
    || tokenSet.has(normalizeMentionKey(user.email || ""))
    || tokenSet.has(normalizeMentionKey(user.full_name || ""))
  ));
};

const createMentionNotifications = async ({ projectId, taskId, senderId, text, mentionedUsers }) => {
  const notifications = mentionedUsers
    .filter((user) => user._id.toString() !== senderId)
    .map((user) => ({
      recipient_id: user._id,
      sender_id: senderId,
      type: "mention",
      title: "Bạn được nhắc đến trong task",
      body: text.slice(0, 180),
      link_to: `/projects/${projectId}?task=${taskId}`,
      is_read: false,
    }));

  if (notifications.length > 0) {
    await createNotifications(notifications);
  }
};

router.get("/", verifyToken, async (req, res) => {
  try {
    const {
      projectId,
      assigneeId,
      status,
      skip = 0,
      limit = 100,
    } = req.query;

    const filter = {};
    if (projectId) filter.project_id = projectId;
    if (assigneeId) filter.assignee_id = assigneeId;
    if (status && status !== "all") filter.status = status;

    const numericSkip = Math.max(Number(skip) || 0, 0);
    const numericLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);

    const [tasks, total] = await Promise.all([
      populateTask(Task.find(filter))
        .sort({ createdAt: -1 })
        .skip(numericSkip)
        .limit(numericLimit),
      Task.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: { total, skip: numericSkip, limit: numericLimit },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/project/:projectId", verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, assignee_id, skip = 0, limit = 100 } = req.query;
    const filter = { project_id: projectId };

    if (status && status !== "all") filter.status = status;
    if (assignee_id) filter.assignee_id = assignee_id;

    const numericSkip = Math.max(Number(skip) || 0, 0);
    const numericLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);

    const [tasks, total] = await Promise.all([
      populateTask(Task.find(filter))
        .sort({ createdAt: -1 })
        .skip(numericSkip)
        .limit(numericLimit),
      Task.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: { total, skip: numericSkip, limit: numericLimit },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/kanban/:projectId", verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const tasks = await Task.find({ project_id: projectId })
      .populate("assignee_id", "full_name avatar email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        todo: tasks.filter((task) => task.status === "todo"),
        in_progress: tasks.filter((task) => task.status === "in_progress"),
        review: tasks.filter((task) => task.status === "review"),
        done: tasks.filter((task) => task.status === "done"),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/:taskId/subtasks", verifyToken, async (req, res) => {
  try {
    const { title } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: "title is required" });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      { $push: { subtasks: { title: title.trim(), is_completed: false } } },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.status(201).json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/subtasks/:subtaskId", verifyToken, async (req, res) => {
  try {
    const { is_completed } = req.body;

    if (typeof is_completed !== "boolean") {
      return res.status(400).json({ success: false, message: "is_completed must be boolean" });
    }

    const task = await Task.findOneAndUpdate(
      { "subtasks._id": req.params.subtaskId },
      { $set: { "subtasks.$.is_completed": is_completed } },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: "Subtask not found" });
    }

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:taskId/comments", verifyToken, async (req, res) => {
  try {
    const comments = await Comment.find({ task_id: req.params.taskId })
      .populate("sender_id", "full_name email avatar")
      .populate("mentions", "full_name email avatar")
      .sort({ createdAt: 1 });

    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/:taskId/comments", verifyToken, async (req, res) => {
  try {
    const { text, attachments = [] } = req.body;

    if (!text?.trim() && attachments.length === 0) {
      return res.status(400).json({ success: false, message: "text or attachments is required" });
    }

    const task = await Task.findById(req.params.taskId).select("title project_id");
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const mentionedUsers = await extractMentionedUsers(text || "");
    const comment = await Comment.create({
      task_id: req.params.taskId,
      sender_id: req.user.userId,
      text: text?.trim() || "",
      attachments,
      mentions: mentionedUsers.map((user) => user._id),
    });

    await createMentionNotifications({
      projectId: task.project_id.toString(),
      taskId: task._id.toString(),
      senderId: req.user.userId,
      text: text || "",
      mentionedUsers,
    });

    const populated = await Comment.findById(comment._id)
      .populate("sender_id", "full_name email avatar")
      .populate("mentions", "full_name email avatar");

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:taskId", verifyToken, async (req, res) => {
  try {
    const task = await populateTask(Task.findById(req.params.taskId));

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      title,
      content_html = "",
      project_id,
      assignee_id,
      reviewer_id,
      priority = "medium",
      start_date,
      due_date,
      status = "todo",
      attachments = [],
      subtasks = [],
    } = req.body;

    if (!title || !project_id) {
      return res.status(400).json({
        success: false,
        message: "title and project_id are required",
      });
    }

    const project = await Project.findById(project_id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const task = await Task.create({
      title,
      content_html,
      project_id,
      assignee_id: assignee_id || undefined,
      reviewer_id: reviewer_id || undefined,
      priority,
      start_date: start_date || undefined,
      due_date: due_date || undefined,
      status,
      attachments,
      subtasks,
      created_by: req.user.userId,
    });

    if (assignee_id) {
      await Project.findByIdAndUpdate(project_id, { $addToSet: { member_ids: assignee_id } });
    }
    if (reviewer_id) {
      await Project.findByIdAndUpdate(project_id, { $addToSet: { member_ids: reviewer_id } });
    }

    if (assignee_id) {
      await createNotification({
        recipient_id: assignee_id,
        sender_id: req.user.userId,
        type: "task_assigned",
        title: "Bạn được giao task mới",
        body: title,
        link_to: `/projects/${project_id}?task=${task._id}`,
        is_read: false,
      });
    }

    res.status(201).json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["todo", "in_progress", "review", "done"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    if (status === "done") {
      return res.status(400).json({
        success: false,
        message: "Tasks must be approved through the review workflow before becoming done.",
      });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/:id/submit", verifyToken, async (req, res) => {
  try {
    const { note = "", submitted_files = [] } = req.body;

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        status: "review",
        execution_result: {
          note,
          submitted_files,
          submitted_at: new Date(),
          review_status: "pending",
          feedback: "",
        },
      },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    await ActivityLog.create({
      user_id: req.user.userId,
      action: "submit_task_result",
      target_type: "Task",
      target_id: task._id,
      details: { note, submitted_files_count: submitted_files.length },
    });

    if (task.reviewer_id) {
      await createNotification({
        recipient_id: task.reviewer_id,
        sender_id: req.user.userId,
        type: "review_requested",
        title: "Task đang chờ duyệt",
        body: task.title,
        link_to: `/projects/${task.project_id}?task=${task._id}`,
        is_read: false,
      });
    }

    if (task.created_by && task.created_by.toString() !== task.reviewer_id?.toString()) {
      await createNotification({
        recipient_id: task.created_by,
        sender_id: req.user.userId,
        type: "review_requested",
        title: "Task đang chờ nghiệm thu",
        body: task.title,
        link_to: `/projects/${task.project_id}?task=${task._id}`,
        is_read: false,
      });
    }

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/:id/review", verifyToken, async (req, res) => {
  try {
    const { action, feedback_note = "" } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "action must be approve or reject" });
    }

    if (action === "reject" && !feedback_note.trim()) {
      return res.status(400).json({ success: false, message: "feedback_note is required when rejecting" });
    }

    const existingTask = await Task.findById(req.params.id);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const requesterId = req.user.userId;
    const canReview = [existingTask.created_by, existingTask.reviewer_id]
      .filter(Boolean)
      .some((id) => id.toString() === requesterId);

    if (!canReview) {
      return res.status(403).json({
        success: false,
        message: "Only task creator or reviewer can review this task.",
      });
    }

    const nextStatus = action === "approve" ? "done" : "in_progress";
    const reviewStatus = action === "approve" ? "approved" : "rejected";

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        status: nextStatus,
        "execution_result.review_status": reviewStatus,
        "execution_result.feedback": feedback_note,
      },
      { new: true }
    );

    await ActivityLog.create({
      user_id: requesterId,
      action: action === "approve" ? "approve_task_result" : "reject_task_result",
      target_type: "Task",
      target_id: existingTask._id,
      details: { feedback_note, status: nextStatus },
    });

    if (existingTask.assignee_id) {
      await createNotification({
        recipient_id: existingTask.assignee_id,
        sender_id: requesterId,
        type: action === "approve" ? "review_approved" : "review_rejected",
        title: action === "approve" ? "Kết quả task đã được nghiệm thu" : "Kết quả task bị từ chối",
        body: feedback_note || existingTask.title,
        link_to: `/projects/${existingTask.project_id}?task=${existingTask._id}`,
        is_read: false,
      });
    }

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
  try {
    const updates = pickAllowed(req.body, allowedTaskFields);
    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/:id", verifyToken, async (req, res) => {
  try {
    const updates = pickAllowed(req.body, allowedTaskFields);
    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/:id/details", verifyToken, async (req, res) => {
  try {
    const { content_html, attachments } = req.body;
    const updates = {};

    if (content_html !== undefined) updates.content_html = content_html;
    if (attachments !== undefined) updates.attachments = attachments;

    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/:taskId/execution-result", verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { note, submitted_files } = req.body;

    const task = await Task.findByIdAndUpdate(
      taskId,
      {
        execution_result: {
          note,
          submitted_files,
          submitted_at: new Date(),
          review_status: "pending",
        },
      },
      { new: true }
    );

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/:taskId/review", verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { review_status, feedback } = req.body;

    if (!["approved", "rejected"].includes(review_status)) {
      return res.status(400).json({
        success: false,
        message: "review_status must be approved or rejected",
      });
    }

    const task = await Task.findByIdAndUpdate(
      taskId,
      {
        "execution_result.review_status": review_status,
        "execution_result.feedback": feedback,
        status: review_status === "approved" ? "done" : "review",
      },
      { new: true }
    );

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:taskId", verifyToken, async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.taskId);

    if (!deletedTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, message: "Task deleted", data: deletedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
