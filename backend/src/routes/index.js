const express = require("express");

const authRoutes = require("./auth.routes");
const workspaceRoutes = require("./workspace.routes");
const userRoutes = require("./user.routes");
const departmentRoutes = require("./department.routes");
const projectRoutes = require("./project.routes");
const taskRoutes = require("./task.routes");
const uploadRoutes = require("./upload.routes");
const analyticsRoutes = require("./analytics.routes");
const notificationRoutes = require("./notification.routes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "ITPM API is healthy",
  });
});

router.use("/auth", authRoutes);
router.use("/workspace", workspaceRoutes);
router.use("/users", userRoutes);
router.use("/departments", departmentRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/upload", uploadRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;
