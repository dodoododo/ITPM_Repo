const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  attachments: [{ file_name: String, file_url: String, file_type: String }],
  read_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Ai đã xem (seen)
}, { timestamps: true });

messageSchema.index({ conversation_id: 1, createdAt: -1 }); // Load lịch sử chat siêu nhanh
module.exports = mongoose.model('Message', messageSchema);
