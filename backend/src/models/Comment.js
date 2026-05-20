const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  attachments: [{ file_name: String, file_url: String, file_type: String, size: Number }],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Danh sách những người bị @tag
}, { timestamps: true });

commentSchema.index({ task_id: 1, createdAt: -1 });
module.exports = mongoose.model('Comment', commentSchema);
