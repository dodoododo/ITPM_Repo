const express = require("express");
const { Notification } = require("../models");
const { verifyToken } = require("../middleware/auth.middleware");
const { populateNotification } = require("../utils/notifications");

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const numericLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

    const notifications = await populateNotification(
      Notification.find({ recipient_id: req.user.userId })
        .sort({ createdAt: -1 })
        .limit(numericLimit)
    );

    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/read-all", verifyToken, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient_id: req.user.userId, is_read: false },
      { $set: { is_read: true } }
    );

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/:id/read", verifyToken, async (req, res) => {
  try {
    const notification = await populateNotification(
      Notification.findOneAndUpdate(
        { _id: req.params.id, recipient_id: req.user.userId },
        { $set: { is_read: true } },
        { new: true }
      )
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
