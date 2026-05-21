const express = require("express");
const { ActivityLog } = require("../models");
const { verifyToken, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const {
      action,
      target_type,
      page = 1,
      limit = 50,
    } = req.query;

    const numericPage = Math.max(Number(page) || 1, 1);
    const numericLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const skip = (numericPage - 1) * numericLimit;
    const filter = {};

    if (action) filter.action = action;
    if (target_type) filter.target_type = target_type;

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate("user_id", "full_name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(numericLimit),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: numericPage,
        limit: numericLimit,
        pages: Math.ceil(total / numericLimit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
