const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  token: { type: String, required: true, unique: true },
  role: { type: String, enum: ["admin", "manager", "employee"], default: "employee" },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  sentAt: { type: Date, default: null },
  lastSendError: { type: String, default: "" },
  status: { type: String, enum: ["pending", "accepted", "expired"], default: "pending" },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Invitation", invitationSchema);
