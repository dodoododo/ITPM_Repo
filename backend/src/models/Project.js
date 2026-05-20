const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#059669' },
  status: { type: String, enum: ['planning', 'active', 'on_hold', 'completed'], default: 'planning' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  start_date: { type: Date },
  end_date: { type: Date },
  
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Quản lý dự án
  member_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

projectSchema.index({ department_id: 1 });
module.exports = mongoose.model('Project', projectSchema);
