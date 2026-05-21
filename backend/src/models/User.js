const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  company_email: { type: String, lowercase: true, trim: true, default: "" },
  notification_email: { type: String, lowercase: true, trim: true, default: "" },
  password: { type: String, required: true },
  avatar: { type: String, default: "" },
  role: { type: String, enum: ["admin", "manager", "employee"], default: "employee" },
  isActive: { type: Boolean, default: true },
  account_status: { type: String, enum: ["pending", "active", "locked", "disabled"], default: "active" },
  invitationStatus: { type: String, enum: ["pending", "accepted", "expired"], default: "accepted" },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  position_title: { type: String, default: "" },
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  hasChangedPassword: { type: Boolean, default: false },
  tokenVersion: { type: Number, default: 0 },
  lastLoginAt: { type: Date, default: null },
  loginAttempts: { type: Number, default: 0 },
  lastLoginAttemptAt: { type: Date, default: null },
  passwordResetTokenHash: { type: String, default: "" },
  passwordResetExpiresAt: { type: Date, default: null },
  passwordResetUsedAt: { type: Date, default: null },
}, { timestamps: true });

// Index for faster queries
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ account_status: 1 });
userSchema.index({ department_id: 1 });
userSchema.index({ manager_id: 1 });
userSchema.index({ passwordResetTokenHash: 1 });

module.exports = mongoose.model("User", userSchema);
