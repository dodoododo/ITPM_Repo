const mongoose = require('mongoose');

const commentAttachmentSchema = {
  file_name: String,
  file_url: String,
  file_type: String,
  size: Number,
};

const commentSchema = new mongoose.Schema({
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  attachments: [commentAttachmentSchema],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  client_request_id: { type: String, default: '' },
}, { timestamps: true });

commentSchema.index({ task_id: 1, createdAt: -1 });
commentSchema.index(
  { task_id: 1, sender_id: 1, client_request_id: 1 },
  { unique: true, sparse: true, partialFilterExpression: { client_request_id: { $type: 'string', $gt: '' } } }
);

module.exports = mongoose.model('Comment', commentSchema);
