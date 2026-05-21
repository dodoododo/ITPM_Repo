const express = require("express");
const mongoose = require("mongoose");
const { Task, Project, Comment, User, ActivityLog, Department } = require("../models");
const { verifyToken, requireRole } = require("../middleware/auth.middleware");
const { createNotification, createNotifications } = require("../utils/notifications");
const { broadcastNewComment, emitMentionNotification, broadcastCommentNotification, emitToUser } = require("../utils/socket");
const { triggerTaskKpiCalculation } = require("../utils/kpiEngine");
const { sendTaskReviewEmail } = require("../utils/emailHelpers");
const {
  canAccessTaskContent,
  canManageTask,
  canUpdateTaskProgress,
  canSubmitTaskResult,
  canReviewTaskResult,
  deny,
  getUserDepartmentIds,
  isManager,
  sameId,
} = require("../utils/rbac");

const router = express.Router();

const allowedTaskFields = [
  "title",
  "content_html",
  "status",
  "group_key",
  "group_name",
  "kpi_weight",
  "priority",
  "start_date",
  "due_date",
  "assignee_id",
  "reviewer_id",
  "subtasks",
  "attachments",
  "execution_result",
  "dependency_ids",
];

const populateTask = (query) =>
  query
    .populate("project_id", "name color status")
    .populate("assignee_id", "full_name avatar email isActive role")
    .populate("reviewer_id", "full_name avatar email isActive role")
    .populate("created_by", "full_name avatar email")
    .populate("dependency_ids", "title status due_date")
    .populate("attachments.uploaded_by", "full_name email avatar")
    .populate("execution_result.submitted_files.uploaded_by", "full_name email avatar");

const pickAllowed = (source, fields) => {
  const updates = {};
  fields.forEach((field) => {
    if (field in source) {
      if (field === "subtasks") {
        updates[field] = normalizeSubtasks(source[field]);
      } else if (field === "dependency_ids") {
        updates[field] = normalizeIdArray(source[field]);
      } else {
        updates[field] = source[field] === "" ? undefined : source[field];
      }
    }
  });
  return updates;
};

const normalizeIdArray = (values = []) => (
  Array.isArray(values) ? [...new Set(values.filter(Boolean).map((value) => value.toString()))] : []
);

const normalizeSubtasks = (subtasks = []) => (
  Array.isArray(subtasks)
    ? subtasks
      .map((subtask) => {
        const text = (subtask.text || subtask.title || "").trim();
        const isDone = Boolean(subtask.isDone ?? subtask.is_completed);
        return text ? {
          ...subtask,
          title: text,
          text,
          is_completed: isDone,
          isDone,
        } : null;
      })
      .filter(Boolean)
    : []
);

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeSubmittedFiles = (files = []) => (
  Array.isArray(files)
    ? files
      .filter((file) => file?.file_url && file?.file_name)
      .map((file) => ({
        file_name: file.file_name,
        file_url: file.file_url,
        file_type: file.file_type,
        size: file.size,
        uploaded_by: file.uploaded_by,
        uploaded_at: file.uploaded_at,
        storage_key: file.storage_key,
        preview_url: file.preview_url,
      }))
    : []
);

const buildManualStatusUpdate = (existingTask, nextStatus) => {
  if (nextStatus === "done") {
    throw createHttpError("Tasks can only become Done after manager approval.", 400);
  }

  if (nextStatus === "review") {
    throw createHttpError("Submit task results through the submission workflow before review.", 400);
  }

  if (existingTask.status === "review") {
    throw createHttpError("Pending Review tasks can only change through approve or reject.", 409);
  }

  if (existingTask.status === "done") {
    throw createHttpError("Done tasks cannot be moved manually.", 409);
  }

  const updates = { status: nextStatus };
  if ((nextStatus === "in_progress" || nextStatus === "needs_revision") && !existingTask.actualStartDate) {
    updates.actualStartDate = new Date();
  }

  return updates;
};

const validateTaskDependencies = async ({ taskId, projectId, dependencyIds }) => {
  const ids = normalizeIdArray(dependencyIds);
  if (taskId && ids.includes(taskId.toString())) {
    const error = new Error("A task cannot depend on itself.");
    error.statusCode = 400;
    throw error;
  }

  if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    const error = new Error("Dependencies must be valid task IDs.");
    error.statusCode = 400;
    throw error;
  }

  if (ids.length === 0) return [];

  const dependencies = await Task.find({ _id: { $in: ids }, project_id: projectId })
    .select("_id title status")
    .lean();

  if (dependencies.length !== ids.length) {
    const error = new Error("Dependencies must be tasks in the same project.");
    error.statusCode = 400;
    throw error;
  }

  return dependencies;
};

const getBlockingDependencies = async (taskOrDependencyIds) => {
  const dependencyIds = Array.isArray(taskOrDependencyIds)
    ? taskOrDependencyIds
    : taskOrDependencyIds?.dependency_ids || [];
  const ids = normalizeIdArray(dependencyIds);
  if (ids.length === 0) return [];

  return Task.find({ _id: { $in: ids }, status: { $ne: "done" } })
    .select("title status")
    .lean();
};

const denyBlockedDependencies = (res, blockingDependencies) => (
  res.status(409).json({
    success: false,
    message: "Dependencies must be done before this task can move to In Progress.",
    data: { blockingDependencies },
  })
);

const buildTaskProjectScopeFilter = async (user) => {
  const userId = user.userId;
  const scope = [
    { owner_id: userId },
    { member_ids: userId },
  ];

  if (isManager(user)) {
    const departmentIds = await getUserDepartmentIds(Department, userId);
    scope.push({ department_id: { $in: departmentIds } });
  }

  return { $or: scope };
};

const getAccessibleProjectIds = async (user, projectId) => {
  if (projectId) {
    const project = await Project.findById(projectId);
    if (!project) return { statusCode: 404, message: "Project not found", projectIds: [] };

    const allowed = await canAccessTaskContent(user, project, Department);
    if (!allowed) return { statusCode: 403, message: "You do not have access to this project's tasks.", projectIds: [] };

    return { projectIds: [project._id] };
  }

  const projects = await Project.find(await buildTaskProjectScopeFilter(user)).select("_id").lean();
  return { projectIds: projects.map((project) => project._id) };
};

const loadTaskAndProject = async (taskId) => {
  const task = await Task.findById(taskId);
  if (!task) return { task: null, project: null };

  const project = await Project.findById(task.project_id);
  return { task, project };
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

    const { statusCode, message, projectIds } = await getAccessibleProjectIds(req.user, projectId);
    if (statusCode) {
      return res.status(statusCode).json({ success: false, message });
    }

    const filter = { project_id: { $in: projectIds } };
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
    const { statusCode, message } = await getAccessibleProjectIds(req.user, projectId);

    if (statusCode) {
      return res.status(statusCode).json({ success: false, message });
    }

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
    const { statusCode, message } = await getAccessibleProjectIds(req.user, projectId);

    if (statusCode) {
      return res.status(statusCode).json({ success: false, message });
    }

    const tasks = await Task.find({ project_id: projectId })
      .populate("assignee_id", "full_name avatar email isActive role")
      .sort({ createdAt: -1 });

    const groups = tasks.reduce((acc, task) => {
      const key = task.group_key || "general";
      if (!acc[key]) {
        acc[key] = {
          key,
          name: task.group_name || "Chung",
          statuses: {
            todo: [],
            in_progress: [],
            review: [],
            needs_revision: [],
            done: [],
          },
        };
      }
      acc[key].statuses[task.status]?.push(task);
      return acc;
    }, {});

    res.json({ success: true, data: Object.values(groups) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/:taskId/subtasks", verifyToken, async (req, res) => {
  try {
    const text = (req.body.text || req.body.title || "").trim();

    if (!text) {
      return res.status(400).json({ success: false, message: "text is required" });
    }

    const { task: existingTask, project } = await loadTaskAndProject(req.params.taskId);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const allowed = await canUpdateTaskProgress(req.user, existingTask, project, Department);
    if (!allowed) {
      return deny(res, "You do not have access to update this task.");
    }

    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      { $push: { subtasks: { title: text, text, is_completed: false, isDone: false } } },
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
    const isDone = req.body.isDone ?? req.body.is_completed;

    if (typeof isDone !== "boolean") {
      return res.status(400).json({ success: false, message: "isDone must be boolean" });
    }

    const existingTask = await Task.findOne({ "subtasks._id": req.params.subtaskId });
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Subtask not found" });
    }

    const project = await Project.findById(existingTask.project_id);
    const allowed = await canUpdateTaskProgress(req.user, existingTask, project, Department);
    if (!allowed) {
      return deny(res, "You do not have access to update this task.");
    }

    const task = await Task.findOneAndUpdate(
      { "subtasks._id": req.params.subtaskId },
      { $set: { "subtasks.$.is_completed": isDone, "subtasks.$.isDone": isDone } },
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
    const { task, project } = await loadTaskAndProject(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const allowed = await canAccessTaskContent(req.user, project, Department);
    if (!allowed) {
      return deny(res, "You do not have access to this task.");
    }

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
    const { text, attachments = [], client_request_id = "" } = req.body;

    if (!text?.trim() && attachments.length === 0) {
      return res.status(400).json({ success: false, message: "text or attachments is required" });
    }

    const task = await Task.findById(req.params.taskId).select("title project_id assignee_id reviewer_id created_by");
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const project = await Project.findById(task.project_id);
    const allowed = await canAccessTaskContent(req.user, project, Department);
    if (!allowed) {
      return deny(res, "You do not have access to this task.");
    }

    const mentionedUsers = await extractMentionedUsers(text || "");
    const safeClientRequestId = String(client_request_id || req.headers["idempotency-key"] || "").slice(0, 120);

    if (safeClientRequestId) {
      const existingComment = await Comment.findOne({
        task_id: req.params.taskId,
        sender_id: req.user.userId,
        client_request_id: safeClientRequestId,
      })
        .populate("sender_id", "full_name email avatar")
        .populate("mentions", "full_name email avatar");

      if (existingComment) {
        return res.status(200).json({ success: true, data: existingComment });
      }
    }

    const comment = await Comment.create({
      task_id: req.params.taskId,
      sender_id: req.user.userId,
      text: text?.trim() || "",
      attachments,
      mentions: mentionedUsers.map((user) => user._id),
      client_request_id: safeClientRequestId,
    });

    const populated = await Comment.findById(comment._id)
      .populate("sender_id", "full_name email avatar")
      .populate("mentions", "full_name email avatar");

    // Real-time: Broadcast new comment to all users in task room
    broadcastNewComment(req.params.taskId, populated);

    // Create and send mention notifications
    await createMentionNotifications({
      projectId: task.project_id.toString(),
      taskId: task._id.toString(),
      senderId: req.user.userId,
      text: text || "",
      mentionedUsers,
    });

    // Real-time: Emit notification to mentioned users
    if (mentionedUsers.length > 0) {
      const mentionedUserIds = mentionedUsers
        .filter((user) => user._id.toString() !== req.user.userId)
        .map((user) => user._id);
      
      const notification = {
        type: "mention",
        title: "Bạn được nhắc đến trong task",
        body: text.slice(0, 180),
        link_to: `/projects/${task.project_id}?task=${task._id}`,
        sender_id: req.user.userId,
        taskId: req.params.taskId,
      };
      emitMentionNotification(mentionedUserIds, notification);
    }

    const mentionedIdSet = new Set(mentionedUsers.map((user) => user._id.toString()));
    const participantIds = [task.assignee_id, task.reviewer_id, task.created_by]
      .filter(Boolean)
      .map((id) => id.toString())
      .filter((id) => id !== req.user.userId && !mentionedIdSet.has(id));

    if (participantIds.length > 0) {
      await createNotifications([...new Set(participantIds)].map((recipientId) => ({
        recipient_id: recipientId,
        sender_id: req.user.userId,
        type: "task_comment",
        title: "New comment on task",
        body: (text || "Attachment").slice(0, 180),
        link_to: `/projects/${task.project_id}?task=${task._id}`,
        is_read: false,
      })));
      broadcastCommentNotification(req.params.taskId, {
        type: "task_comment",
        taskId: req.params.taskId,
        body: (text || "Attachment").slice(0, 180),
      });
    }

    await ActivityLog.create({
      user_id: req.user.userId,
      action: "comment_task",
      target_type: "Task",
      target_id: task._id,
      details: {
        comment_id: populated._id,
        attachments_count: attachments.length,
        mentions_count: mentionedUsers.length,
      },
    });

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    if (error.code === 11000 && req.body.client_request_id) {
      const existingComment = await Comment.findOne({
        task_id: req.params.taskId,
        sender_id: req.user.userId,
        client_request_id: req.body.client_request_id,
      })
        .populate("sender_id", "full_name email avatar")
        .populate("mentions", "full_name email avatar");
      if (existingComment) {
        return res.status(200).json({ success: true, data: existingComment });
      }
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:taskId", verifyToken, async (req, res) => {
  try {
    const { task: existingTask, project } = await loadTaskAndProject(req.params.taskId);

    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const allowed = await canAccessTaskContent(req.user, project, Department);
    if (!allowed) {
      return deny(res, "You do not have access to this task.");
    }

    const task = await populateTask(Task.findById(req.params.taskId));
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", verifyToken, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const {
      title,
      content_html = "",
      project_id,
      assignee_id,
      reviewer_id,
      priority = "medium",
      group_key = "general",
      group_name = "Chung",
      kpi_weight = 0,
      start_date,
      due_date,
      attachments = [],
      subtasks = [],
      dependency_ids = [],
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

    const allowed = await canManageTask(req.user, project, Department);
    if (!allowed) {
      return deny(res, "Only project managers in scope can create tasks.");
    }

    const normalizedDependencyIds = normalizeIdArray(dependency_ids);
    await validateTaskDependencies({ projectId: project_id, dependencyIds: normalizedDependencyIds });

    const task = await Task.create({
      title,
      content_html,
      project_id,
      assignee_id: assignee_id || undefined,
      reviewer_id: reviewer_id || undefined,
      priority,
      group_key: group_key || "general",
      group_name: group_name || "Chung",
      kpi_weight: Number(kpi_weight) || 0,
      start_date: start_date || undefined,
      due_date: due_date || undefined,
      status: "todo",
      attachments,
      subtasks: normalizeSubtasks(subtasks),
      dependency_ids: normalizedDependencyIds,
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

    await ActivityLog.create({
      user_id: req.user.userId,
      action: "create_task",
      target_type: "Task",
      target_id: task._id,
      details: {
        title,
        project_id,
        assignee_id,
        reviewer_id,
        group_key: task.group_key,
        group_name: task.group_name,
        kpi_weight: task.kpi_weight,
      },
    });

    res.status(201).json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["todo", "in_progress", "review", "needs_revision", "done"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const { task: existingTask, project } = await loadTaskAndProject(req.params.id);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const allowed = await canUpdateTaskProgress(req.user, existingTask, project, Department);
    if (!allowed) {
      return deny(res, "You do not have access to update this task.");
    }

    const canMoveStatus = sameId(existingTask.assignee_id, req.user.userId)
      || req.user.role === "admin"
      || req.user.role === "manager";
    if (!canMoveStatus) {
      return deny(res, "Only the assignee or a manager can move task status.");
    }

    if (status === "in_progress") {
      const blockingDependencies = await getBlockingDependencies(existingTask);
      if (blockingDependencies.length > 0) {
        return denyBlockedDependencies(res, blockingDependencies);
      }
    }

    const statusUpdates = buildManualStatusUpdate(existingTask, status);

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      statusUpdates,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    await ActivityLog.create({
      user_id: req.user.userId,
      action: "update_task_status",
      target_type: "Task",
      target_id: task._id,
      details: {
        from_status: existingTask.status,
        to_status: status,
        actualStartDate: statusUpdates.actualStartDate,
      },
    });

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.patch("/:id/reassign", verifyToken, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const newAssigneeId = req.body.assigneeId || req.body.assignee_id;

    if (!newAssigneeId || !mongoose.Types.ObjectId.isValid(newAssigneeId)) {
      return res.status(400).json({ success: false, message: "A valid assigneeId is required." });
    }

    const { task: existingTask, project } = await loadTaskAndProject(req.params.id);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (!["todo", "in_progress"].includes(existingTask.status)) {
      return res.status(409).json({
        success: false,
        message: "Only Todo or In Progress orphaned tasks can be reassigned.",
      });
    }

    const allowed = await canManageTask(req.user, project, Department);
    if (!allowed) {
      return deny(res, "Only managers in scope can reassign orphaned tasks.");
    }

    const [currentAssignee, nextAssignee] = await Promise.all([
      existingTask.assignee_id ? User.findById(existingTask.assignee_id).select("full_name email isActive").lean() : null,
      User.findById(newAssigneeId).select("full_name email isActive role").lean(),
    ]);

    if (!currentAssignee || currentAssignee.isActive !== false) {
      return res.status(409).json({
        success: false,
        message: "This task is not orphaned. Its current assignee is still active.",
      });
    }

    if (!nextAssignee || nextAssignee.isActive === false) {
      return res.status(400).json({
        success: false,
        message: "New assignee must be an active user.",
      });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { assignee_id: nextAssignee._id },
      { new: true }
    );

    await Project.findByIdAndUpdate(existingTask.project_id, {
      $addToSet: { member_ids: nextAssignee._id },
    });

    await ActivityLog.create({
      user_id: req.user.userId,
      action: "reassign_orphaned_task",
      target_type: "Task",
      target_id: task._id,
      details: {
        previous_assignee_id: existingTask.assignee_id,
        previous_assignee_email: currentAssignee.email,
        new_assignee_id: nextAssignee._id,
        new_assignee_email: nextAssignee.email,
        status: existingTask.status,
      },
    });

    await createNotification({
      recipient_id: nextAssignee._id,
      sender_id: req.user.userId,
      type: "task_assigned",
      title: "Task reassigned to you",
      body: task.title,
      link_to: `/projects/${task.project_id}?task=${task._id}`,
      is_read: false,
    });

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.post("/:id/submit", verifyToken, async (req, res) => {
  try {
    const { note = "" } = req.body;
    const submittedFiles = normalizeSubmittedFiles(req.body.submitted_files || req.body.attachments || []);

    if (!note.trim()) {
      return res.status(400).json({
        success: false,
        message: "Submission note is required before submitting a task.",
      });
    }

    const { task: existingTask, project } = await loadTaskAndProject(req.params.id);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const canAccess = await canAccessTaskContent(req.user, project, Department);
    if (!canAccess || !canSubmitTaskResult(req.user, existingTask)) {
      return deny(res, "Only the assignee can submit this task result.");
    }

    if (!["in_progress", "needs_revision"].includes(existingTask.status)) {
      return res.status(409).json({ success: false, message: "Task must be In Progress or Needs Revision before submission." });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        status: "review",
        execution_result: {
          note: note.trim(),
          submitted_files: submittedFiles,
          submitted_at: new Date(),
          review_status: "pending",
          feedback: "",
          reject_reason: "",
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
      details: { note: note.trim(), submitted_files_count: submittedFiles.length, from_status: existingTask.status, to_status: "review" },
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

    const reviewer = task.reviewer_id ? await User.findById(task.reviewer_id).select("email notification_email full_name").lean() : null;
    if (reviewer?.email) {
      try {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        await sendTaskReviewEmail({
          toEmail: reviewer.notification_email || reviewer.email,
          taskTitle: task.title,
          actionUrl: `${frontendUrl}/projects/${task.project_id}?task=${task._id}`,
          subject: "Task is waiting for acceptance",
          message: `${task.title} was submitted for review.`,
        });
      } catch (mailError) {
        await ActivityLog.create({
          user_id: req.user.userId,
          action: "review_request_email_failed",
          target_type: "Task",
          target_id: task._id,
          details: { error: mailError.message },
        });
      }
    }

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/:id/review", verifyToken, async (req, res) => {
  try {
    const { action } = req.body;
    const rejectReason = (req.body.rejectReason || req.body.feedback_note || "").trim();
    const feedbackNote = action === "reject" ? rejectReason : (req.body.feedback_note || "").trim();

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "action must be approve or reject" });
    }

    if (action === "reject" && !rejectReason) {
      return res.status(400).json({ success: false, message: "rejectReason is required when rejecting" });
    }

    const { task: existingTask, project } = await loadTaskAndProject(req.params.id);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (existingTask.status !== "review") {
      return res.status(409).json({ success: false, message: "Task is not pending review." });
    }

    const requesterId = req.user.userId;
    const canReview = await canReviewTaskResult(req.user, existingTask, project, Department);

    if (!canReview) {
      return res.status(403).json({
        success: false,
        message: "Only project managers or assigned reviewers in scope can review this task.",
      });
    }

    const nextStatus = action === "approve" ? "done" : "needs_revision";
    const reviewStatus = action === "approve" ? "approved" : "rejected";

    if (nextStatus === "in_progress") {
      const blockingDependencies = await getBlockingDependencies(existingTask);
      if (blockingDependencies.length > 0) {
        return denyBlockedDependencies(res, blockingDependencies);
      }
    }

    const reviewUpdates = {
      status: nextStatus,
      "execution_result.review_status": reviewStatus,
      "execution_result.feedback": feedbackNote,
      "execution_result.reject_reason": action === "reject" ? rejectReason : "",
      "execution_result.reviewed_at": new Date(),
      "execution_result.reviewed_by": requesterId,
    };

    if (action === "approve") {
      reviewUpdates.actualFinishDate = new Date();
    } else if (!existingTask.actualStartDate) {
      reviewUpdates.actualStartDate = new Date();
    }

    let task = await Task.findByIdAndUpdate(
      req.params.id,
      reviewUpdates,
      { new: true }
    );

    let kpiResult = null;
    if (action === "approve") {
      kpiResult = await triggerTaskKpiCalculation(Task, task._id);
      task = await Task.findById(task._id);
    }

    await ActivityLog.create({
      user_id: requesterId,
      action: action === "approve" ? "approve_task_result" : "reject_task_result",
      target_type: "Task",
      target_id: existingTask._id,
      details: {
        feedback_note: feedbackNote,
        rejectReason: action === "reject" ? rejectReason : undefined,
        from_status: existingTask.status,
        to_status: nextStatus,
        actualFinishDate: reviewUpdates.actualFinishDate,
        kpi_result: kpiResult,
      },
    });

    if (existingTask.assignee_id) {
      await createNotification({
        recipient_id: existingTask.assignee_id,
        sender_id: requesterId,
        type: action === "approve" ? "review_approved" : "review_rejected",
        title: action === "approve" ? "Kết quả task đã được nghiệm thu" : "Kết quả task bị từ chối",
        body: feedbackNote || existingTask.title,
        link_to: `/projects/${existingTask.project_id}?task=${existingTask._id}`,
        is_read: false,
      });

      emitToUser(existingTask.assignee_id, action === "approve" ? "task_approved" : "task_rejected", {
        taskId: existingTask._id,
        projectId: existingTask.project_id,
        status: nextStatus,
        rejectReason: action === "reject" ? rejectReason : undefined,
        kpi_result: kpiResult,
      });
    }

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { task: existingTask, project } = await loadTaskAndProject(req.params.id);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const allowed = await canManageTask(req.user, project, Department);
    if (!allowed) {
      return deny(res, "Only project managers in scope can update task assignment and schedule.");
    }

    const updates = pickAllowed(req.body, allowedTaskFields);

    if ("dependency_ids" in updates) {
      await validateTaskDependencies({
        taskId: req.params.id,
        projectId: existingTask.project_id,
        dependencyIds: updates.dependency_ids,
      });
    }

    const nextDependencyIds = "dependency_ids" in updates ? updates.dependency_ids : existingTask.dependency_ids;
    const nextStatus = updates.status || existingTask.status;
    if (nextStatus === "in_progress") {
      const blockingDependencies = await getBlockingDependencies(nextDependencyIds);
      if (blockingDependencies.length > 0) {
        return denyBlockedDependencies(res, blockingDependencies);
      }
    }

    if ("status" in updates) {
      Object.assign(updates, buildManualStatusUpdate(existingTask, updates.status));
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const changedFields = Object.keys(updates).filter((field) => field !== "status");
    if (changedFields.length > 0) {
      await ActivityLog.create({
        user_id: req.user.userId,
        action: "update_task",
        target_type: "Task",
        target_id: task._id,
        details: {
          fields: changedFields,
          from_start_date: existingTask.start_date,
          to_start_date: updates.start_date,
          from_due_date: existingTask.due_date,
          to_due_date: updates.due_date,
          from_assignee_id: existingTask.assignee_id,
          to_assignee_id: updates.assignee_id,
          from_group_key: existingTask.group_key,
          to_group_key: updates.group_key,
          from_group_name: existingTask.group_name,
          to_group_name: updates.group_name,
        },
      });
    }

    if ("status" in updates && updates.status !== existingTask.status) {
      await ActivityLog.create({
        user_id: req.user.userId,
        action: "update_task_status",
        target_type: "Task",
        target_id: task._id,
        details: {
          from_status: existingTask.status,
          to_status: updates.status,
          actualStartDate: updates.actualStartDate,
        },
      });
    }

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.patch("/:id", verifyToken, async (req, res) => {
  try {
    const { task: existingTask, project } = await loadTaskAndProject(req.params.id);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const allowed = await canManageTask(req.user, project, Department);
    if (!allowed) {
      return deny(res, "Only project managers in scope can update task assignment and schedule.");
    }

    const updates = pickAllowed(req.body, allowedTaskFields);

    if ("dependency_ids" in updates) {
      await validateTaskDependencies({
        taskId: req.params.id,
        projectId: existingTask.project_id,
        dependencyIds: updates.dependency_ids,
      });
    }

    const nextDependencyIds = "dependency_ids" in updates ? updates.dependency_ids : existingTask.dependency_ids;
    const nextStatus = updates.status || existingTask.status;
    if (nextStatus === "in_progress") {
      const blockingDependencies = await getBlockingDependencies(nextDependencyIds);
      if (blockingDependencies.length > 0) {
        return denyBlockedDependencies(res, blockingDependencies);
      }
    }

    if ("status" in updates) {
      Object.assign(updates, buildManualStatusUpdate(existingTask, updates.status));
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if ("status" in updates && updates.status !== existingTask.status) {
      await ActivityLog.create({
        user_id: req.user.userId,
        action: "update_task_status",
        target_type: "Task",
        target_id: task._id,
        details: {
          from_status: existingTask.status,
          to_status: updates.status,
          actualStartDate: updates.actualStartDate,
        },
      });
    }

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.patch("/:id/details", verifyToken, async (req, res) => {
  try {
    const { content_html, attachments } = req.body;
    const updates = {};

    if (content_html !== undefined) updates.content_html = content_html;
    if (attachments !== undefined) updates.attachments = attachments;

    const { task: existingTask, project } = await loadTaskAndProject(req.params.id);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const allowed = await canManageTask(req.user, project, Department);
    if (!allowed) {
      return deny(res, "Only project managers in scope can update task details.");
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const previousAttachments = existingTask.attachments || [];
    const nextAttachments = updates.attachments || previousAttachments;
    if (updates.content_html !== undefined || updates.attachments !== undefined) {
      const previousUrls = new Set(previousAttachments.map((item) => item.file_url).filter(Boolean));
      const nextUrls = new Set(nextAttachments.map((item) => item.file_url).filter(Boolean));
      const addedAttachments = nextAttachments.filter((item) => item.file_url && !previousUrls.has(item.file_url));
      const removedAttachments = previousAttachments.filter((item) => item.file_url && !nextUrls.has(item.file_url));

      await ActivityLog.create({
        user_id: req.user.userId,
        action: "update_task_details",
        target_type: "Task",
        target_id: task._id,
        details: {
          content_changed: updates.content_html !== undefined && updates.content_html !== existingTask.content_html,
          previous_attachment_count: previousAttachments.length,
          next_attachment_count: nextAttachments.length,
        },
      });

      if (addedAttachments.length > 0) {
        await ActivityLog.create({
          user_id: req.user.userId,
          action: "upload_file",
          target_type: "Task",
          target_id: task._id,
          details: {
            files: addedAttachments.map((item) => ({
              file_name: item.file_name,
              file_type: item.file_type,
              size: item.size,
              file_url: item.file_url,
            })),
          },
        });
      }

      if (removedAttachments.length > 0) {
        await ActivityLog.create({
          user_id: req.user.userId,
          action: "delete_file",
          target_type: "Task",
          target_id: task._id,
          details: {
            files: removedAttachments.map((item) => ({
              file_name: item.file_name,
              file_type: item.file_type,
              size: item.size,
              file_url: item.file_url,
            })),
          },
        });
      }
    }

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/:taskId/execution-result", verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { note = "" } = req.body;
    const submittedFiles = normalizeSubmittedFiles(req.body.submitted_files || req.body.attachments || []);

    if (!note.trim()) {
      return res.status(400).json({
        success: false,
        message: "Submission note is required before submitting a task.",
      });
    }

    const { task: existingTask, project } = await loadTaskAndProject(taskId);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const canAccess = await canAccessTaskContent(req.user, project, Department);
    if (!canAccess || !canSubmitTaskResult(req.user, existingTask)) {
      return deny(res, "Only the assignee can update execution result.");
    }

    if (!["in_progress", "needs_revision"].includes(existingTask.status)) {
      return res.status(409).json({ success: false, message: "Task must be In Progress or Needs Revision before submission." });
    }

    const task = await Task.findByIdAndUpdate(
      taskId,
      {
        status: "review",
        execution_result: {
          note: note.trim(),
          submitted_files: submittedFiles,
          submitted_at: new Date(),
          review_status: "pending",
          feedback: "",
          reject_reason: "",
        },
      },
      { new: true }
    );

    await ActivityLog.create({
      user_id: req.user.userId,
      action: "submit_task_result",
      target_type: "Task",
      target_id: task._id,
      details: { note: note.trim(), submitted_files_count: submittedFiles.length, from_status: existingTask.status, to_status: "review" },
    });

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/:taskId/review", verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { review_status } = req.body;
    const action = review_status === "approved" ? "approve" : "reject";
    const rejectReason = (req.body.rejectReason || req.body.feedback || "").trim();
    const feedback = action === "reject" ? rejectReason : (req.body.feedback || "").trim();

    if (!["approved", "rejected"].includes(review_status)) {
      return res.status(400).json({
        success: false,
        message: "review_status must be approved or rejected",
      });
    }

    if (action === "reject" && !rejectReason) {
      return res.status(400).json({ success: false, message: "rejectReason is required when rejecting" });
    }

    const { task: existingTask, project } = await loadTaskAndProject(taskId);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (existingTask.status !== "review") {
      return res.status(409).json({ success: false, message: "Task is not pending review." });
    }

    const canReview = await canReviewTaskResult(req.user, existingTask, project, Department);
    if (!canReview) {
      return deny(res, "Only project managers or assigned reviewers in scope can review this task.");
    }

    const nextStatus = action === "approve" ? "done" : "needs_revision";
    const reviewUpdates = {
      "execution_result.review_status": review_status,
      "execution_result.feedback": feedback,
      "execution_result.reject_reason": action === "reject" ? rejectReason : "",
      "execution_result.reviewed_at": new Date(),
      "execution_result.reviewed_by": req.user.userId,
      status: nextStatus,
    };

    if (action === "approve") {
      reviewUpdates.actualFinishDate = new Date();
    } else if (!existingTask.actualStartDate) {
      reviewUpdates.actualStartDate = new Date();
    }

    let task = await Task.findByIdAndUpdate(
      taskId,
      reviewUpdates,
      { new: true }
    );

    let kpiResult = null;
    if (action === "approve") {
      kpiResult = await triggerTaskKpiCalculation(Task, task._id);
      task = await Task.findById(task._id);
    }

    await ActivityLog.create({
      user_id: req.user.userId,
      action: action === "approve" ? "approve_task_result" : "reject_task_result",
      target_type: "Task",
      target_id: existingTask._id,
      details: {
        feedback_note: feedback,
        rejectReason: action === "reject" ? rejectReason : undefined,
        from_status: existingTask.status,
        to_status: nextStatus,
        actualFinishDate: reviewUpdates.actualFinishDate,
        kpi_result: kpiResult,
      },
    });

    if (existingTask.assignee_id) {
      await createNotification({
        recipient_id: existingTask.assignee_id,
        sender_id: req.user.userId,
        type: action === "approve" ? "review_approved" : "review_rejected",
        title: action === "approve" ? "Ket qua task da duoc nghiem thu" : "Ket qua task bi tu choi",
        body: feedback || existingTask.title,
        link_to: `/projects/${existingTask.project_id}?task=${existingTask._id}`,
        is_read: false,
      });

      emitToUser(existingTask.assignee_id, action === "approve" ? "task_approved" : "task_rejected", {
        taskId: existingTask._id,
        projectId: existingTask.project_id,
        status: nextStatus,
        rejectReason: action === "reject" ? rejectReason : undefined,
        kpi_result: kpiResult,
      });
    }

    res.json({ success: true, data: await populateTask(Task.findById(task._id)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:taskId", verifyToken, async (req, res) => {
  try {
    const { task: existingTask, project } = await loadTaskAndProject(req.params.taskId);
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const allowed = await canManageTask(req.user, project, Department);
    if (!allowed) {
      return deny(res, "Only project managers in scope can delete tasks.");
    }

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
