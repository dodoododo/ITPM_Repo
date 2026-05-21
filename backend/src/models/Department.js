const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, uppercase: true, trim: true, unique: true, sparse: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#2563EB' },
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  member_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

departmentSchema.index({ manager_id: 1 });
module.exports = mongoose.model('Department', departmentSchema);
