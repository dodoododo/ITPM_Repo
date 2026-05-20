const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { 
    type: String, 
    enum: ['task_assigned', 'task_comment', 'review_requested', 'review_approved', 'review_rejected', 'mention', 'system'], 
    required: true 
  },
  title: { type: String, required: true },
  body: { type: String, required: true },
  link_to: { type: String, required: true }, // Đường dẫn mở Task
  is_read: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ recipient_id: 1, is_read: 1 });
module.exports = mongoose.model('Notification', notificationSchema);
