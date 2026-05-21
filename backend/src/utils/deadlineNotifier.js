const Task = require("../models/Task");
const Notification = require("../models/Notification");
const { emitToUser } = require("./socket");

const MS_PER_HOUR = 60 * 60 * 1000;

const isActiveStatus = { $nin: ["done"] };

const buildTaskLink = (task) => `/projects/${task.project_id}?task=${task._id}`;

const upsertDeadlineNotification = async ({ task, type, title, body }) => {
  if (!task.assignee_id || !task.due_date) return;

  const dueKey = new Date(task.due_date).toISOString().slice(0, 10);
  const dedupeKey = `${type}:${task._id}:${task.assignee_id}:${dueKey}`;
  const link = buildTaskLink(task);

  const result = await Notification.findOneAndUpdate(
    { dedupe_key: dedupeKey },
    {
      $setOnInsert: {
        recipient_id: task.assignee_id,
        type,
        title,
        body,
        link_to: link,
        is_read: false,
        dedupe_key: dedupeKey,
      },
    },
    { upsert: true, new: true, includeResultMetadata: true }
  );

  if (result.lastErrorObject?.updatedExisting === false && result.value) {
    emitToUser(task.assignee_id, "new_notification", result.value);
  }
};

const scanDeadlineNotifications = async () => {
  const now = new Date();
  const lookaheadHours = Number(process.env.DEADLINE_NOTIFICATION_LOOKAHEAD_HOURS) || 24;
  const dueSoonUntil = new Date(now.getTime() + lookaheadHours * MS_PER_HOUR);

  const [dueSoonTasks, overdueTasks] = await Promise.all([
    Task.find({
      assignee_id: { $exists: true, $ne: null },
      due_date: { $gte: now, $lte: dueSoonUntil },
      status: isActiveStatus,
    }).select("title project_id assignee_id due_date status").lean(),
    Task.find({
      assignee_id: { $exists: true, $ne: null },
      due_date: { $lt: now },
      status: isActiveStatus,
    }).select("title project_id assignee_id due_date status").lean(),
  ]);

  await Promise.all([
    ...dueSoonTasks.map((task) => upsertDeadlineNotification({
      task,
      type: "deadline_due",
      title: "Task sap den han",
      body: `${task.title} den han vao ${new Date(task.due_date).toLocaleDateString("vi-VN")}.`,
    })),
    ...overdueTasks.map((task) => upsertDeadlineNotification({
      task,
      type: "deadline_overdue",
      title: "Task qua han",
      body: `${task.title} da qua han tu ${new Date(task.due_date).toLocaleDateString("vi-VN")}.`,
    })),
  ]);
};

const startDeadlineNotifier = () => {
  if (process.env.DEADLINE_NOTIFIER_ENABLED === "false") return null;

  const intervalMinutes = Number(process.env.DEADLINE_NOTIFICATION_INTERVAL_MINUTES) || 60;
  const intervalMs = Math.max(5, intervalMinutes) * 60 * 1000;
  const run = () => {
    scanDeadlineNotifications().catch((error) => {
      console.error("Deadline notification scan failed:", error.message);
    });
  };

  setTimeout(run, 10000);
  return setInterval(run, intervalMs);
};

module.exports = {
  scanDeadlineNotifications,
  startDeadlineNotifier,
};
