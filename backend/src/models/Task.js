const mongoose = require('mongoose');

const attachmentSchema = {
  file_name: String,
  file_url: String,
  file_type: String,
  size: Number,
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploaded_at: { type: Date },
  storage_key: String,
  preview_url: String,
};

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content_html: { type: String, default: '' },

  status: { type: String, enum: ['todo', 'in_progress', 'review', 'needs_revision', 'done'], default: 'todo' },
  group_key: { type: String, default: 'general', trim: true },
  group_name: { type: String, default: 'Chung', trim: true },
  kpi_weight: { type: Number, default: 0, min: 0 },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  start_date: { type: Date },
  due_date: { type: Date },
  actualStartDate: { type: Date },
  actualFinishDate: { type: Date },

  attachments: [attachmentSchema],
  subtasks: [{
    title: String,
    text: String,
    is_completed: { type: Boolean, default: false },
    isDone: { type: Boolean, default: false },
  }],

  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  assignee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dependency_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],

  execution_result: {
    note: { type: String, default: '' },
    submitted_files: [attachmentSchema],
    submitted_at: { type: Date },
    review_status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    feedback: { type: String, default: '' },
    reject_reason: { type: String, default: '' },
    reviewed_at: { type: Date },
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },

  kpi_result: {
    score: { type: Number, default: 0 },
    difficulty_weight: { type: Number, default: 0 },
    timeliness_bonus: { type: Number, default: 0 },
    days_delta: { type: Number, default: 0 },
    completed_early: { type: Boolean, default: false },
    calculated_at: { type: Date },
  },
}, { timestamps: true });

taskSchema.index({ project_id: 1, status: 1 });
taskSchema.index({ project_id: 1, group_key: 1, status: 1 });
taskSchema.index({ assignee_id: 1 });
taskSchema.index({ dependency_ids: 1 });

module.exports = mongoose.model('Task', taskSchema);
