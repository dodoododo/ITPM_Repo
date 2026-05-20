const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content_html: { type: String, default: '' }, // Mô tả Rich Text
  
  status: { type: String, enum: ['todo', 'in_progress', 'review', 'done'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  start_date: { type: Date },
  due_date: { type: Date },
  
  // Tài liệu đính kèm lúc giao việc
  attachments: [{
    file_name: String, file_url: String, file_type: String, size: Number
  }],
  // Công việc con
  subtasks: [{
    title: String, is_completed: { type: Boolean, default: false }
  }],
  
  // Liên kết nhân sự
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  assignee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Luồng Báo cáo & Nghiệm thu
  execution_result: {
    note: { type: String, default: '' },
    submitted_files: [{ file_name: String, file_url: String }],
    submitted_at: { type: Date },
    review_status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    feedback: { type: String, default: '' } // Sếp mắng vốn ở đây
  }
}, { timestamps: true });

// Tối ưu tốc độ load bảng Kanban
taskSchema.index({ project_id: 1, status: 1 });
taskSchema.index({ assignee_id: 1 }); 
module.exports = mongoose.model('Task', taskSchema);
