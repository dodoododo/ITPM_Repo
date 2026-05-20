const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String, default: "" },
  role: { type: String, enum: ["admin", "manager", "employee"], default: "employee" },
  isActive: { type: Boolean, default: true },
  invitationStatus: { type: String, enum: ["pending", "accepted"], default: "accepted" },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
