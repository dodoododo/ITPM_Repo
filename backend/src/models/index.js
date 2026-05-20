/**
 * MODELS INDEX FILE
 * Tập hợp tất cả các Mongoose models cho dễ import
 */

module.exports = {
  User: require('./User'),
  Invitation: require('./Invitation'),
  Department: require('./Department'),
  Project: require('./Project'),
  Task: require('./Task'),
  Comment: require('./Comment'),
  Notification: require('./Notification'),
  Conversation: require('./Conversation'),
  Message: require('./Message'),
  ActivityLog: require('./ActivityLog'),
};
