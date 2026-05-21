const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  name: { type: String, default: '' }, // Tên nhóm chat (nếu có)
  is_group: { type: Boolean, default: false },
  // Liên kết tự động (Nếu kênh chat này sinh ra từ Project/Department)
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  
  member_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  last_message: {
    text: String,
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sent_at: { type: Date }
  }
}, { timestamps: true });

conversationSchema.index({ member_ids: 1 });
module.exports = mongoose.model('Conversation', conversationSchema);
