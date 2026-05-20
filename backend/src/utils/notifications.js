const { Notification } = require("../models");
const { emitToUser } = require("./socket");

const populateNotification = (query) =>
  query
    .populate("sender_id", "full_name email avatar")
    .populate("recipient_id", "full_name email avatar");

const toObject = (notification) => (
  typeof notification?.toObject === "function" ? notification.toObject() : notification
);

const createNotification = async (payload) => {
  const notification = await Notification.create(payload);
  const populated = await populateNotification(Notification.findById(notification._id));
  const data = toObject(populated);

  emitToUser(payload.recipient_id, "new_notification", data);
  return data;
};

const createNotifications = async (items) => {
  const created = [];

  for (const item of items) {
    created.push(await createNotification(item));
  }

  return created;
};

module.exports = {
  createNotification,
  createNotifications,
  populateNotification,
};
