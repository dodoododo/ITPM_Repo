const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Ai làm
  action: { type: String, required: true }, // Làm gì (VD: "đã đổi trạng thái", "đã tạo")
  target_type: { type: String, enum: ['Project', 'Task', 'Department', 'User'], required: true }, // Tác động lên cái gì
  target_id: { type: mongoose.Schema.Types.ObjectId, required: true }, // ID của cái bị tác động
  details: { type: Object } // Chứa thông tin bổ sung (VD: { from_status: 'todo', to_status: 'done' })
}, { timestamps: true });

activityLogSchema.index({ target_id: 1, target_type: 1 });
module.exports = mongoose.model('ActivityLog', activityLogSchema);
