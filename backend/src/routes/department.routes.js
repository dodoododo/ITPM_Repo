const express = require("express");
const { Department, User, ActivityLog } = require("../models");
const { verifyToken, requireRole } = require("../middleware/auth.middleware");
const { formatResponse, formatErrorResponse, createActivityLog } = require("../utils/apiHelpers");
const { isAdmin } = require("../utils/rbac");

const router = express.Router();

const populateDepartment = (query) =>
  query
    .populate("manager_id", "full_name email avatar role")
    .populate("member_ids", "full_name email avatar role");

const getDepartmentWithMembers = (id) => populateDepartment(Department.findById(id));

const normalizeCode = (value) => value?.trim().toUpperCase();

const getRequestedManagerId = (body) => body.managerId || body.manager_id;

const validateDepartmentManager = async (managerId) => {
  if (!managerId) return null;

  const manager = await User.findById(managerId).select("_id role full_name email");
  if (!manager) {
    const error = new Error("Manager khong ton tai");
    error.statusCode = 404;
    throw error;
  }

  if (!["admin", "manager"].includes(manager.role)) {
    const error = new Error("managerId phai thuoc user co role manager hoac admin");
    error.statusCode = 400;
    throw error;
  }

  return manager;
};

const addMemberCount = (department) => ({
  ...department.toObject(),
  member_count: department.member_ids?.length || 0,
});

const buildDepartmentScopeFilter = (user) => {
  if (isAdmin(user)) return {};
  return {
    $or: [
      { manager_id: user.userId },
      { member_ids: user.userId },
    ],
  };
};

router.get("/", verifyToken, async (req, res) => {
  try {
    const departments = await populateDepartment(Department.find(buildDepartmentScopeFilter(req.user)))
      .sort({ createdAt: -1 });

    res.json(formatResponse(true, departments.map(addMemberCount)));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

router.get("/:id", verifyToken, async (req, res) => {
  try {
    const department = await getDepartmentWithMembers(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Phong ban khong ton tai",
      });
    }

    if (!isAdmin(req.user)) {
      const requesterId = req.user.userId;
      const isManager = department.manager_id?._id?.toString() === requesterId;
      const isMember = (department.member_ids || []).some((member) => member._id?.toString() === requesterId);

      if (!isManager && !isMember) {
        return res.status(403).json({
          success: false,
          message: "Ban khong co quyen xem phong ban nay",
        });
      }
    }

    res.json(formatResponse(true, addMemberCount(department)));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

router.post("/", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const code = normalizeCode(req.body.code);
    const managerId = getRequestedManagerId(req.body);

    if (!name?.trim() || !code || !managerId) {
      return res.status(400).json({
        success: false,
        message: "name, code va managerId la bat buoc",
      });
    }

    await validateDepartmentManager(managerId);

    const duplicated = await Department.exists({ code });
    if (duplicated) {
      return res.status(409).json({
        success: false,
        message: "Ma phong ban da ton tai",
      });
    }

    const department = await Department.create({
      name: name.trim(),
      code,
      description: description || "",
      color: color || "#2563EB",
      manager_id: managerId,
      member_ids: [managerId],
    });

    await createActivityLog(
      ActivityLog,
      req.user.userId,
      "create_department",
      "Department",
      department._id,
      { name: department.name, code, managerId, color: department.color }
    );

    res
      .status(201)
      .json(formatResponse(true, await getDepartmentWithMembers(department._id), "Department created"));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

router.patch("/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const code = normalizeCode(req.body.code);
    const managerId = getRequestedManagerId(req.body);
    const updateData = {};

    if (name?.trim()) updateData.name = name.trim();
    if (code) updateData.code = code;
    if (description !== undefined) updateData.description = description;
    if (color) updateData.color = color;
    if (managerId) {
      await validateDepartmentManager(managerId);
      updateData.manager_id = managerId;
    }

    if (code) {
      const duplicated = await Department.exists({ code, _id: { $ne: req.params.id } });
      if (duplicated) {
        return res.status(409).json({
          success: false,
          message: "Ma phong ban da ton tai",
        });
      }
    }

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Phong ban khong ton tai",
      });
    }

    if (managerId) {
      department.member_ids.addToSet(managerId);
      await department.save();
    }

    await createActivityLog(
      ActivityLog,
      req.user.userId,
      "update_department",
      "Department",
      department._id,
      updateData
    );

    res.json(formatResponse(true, await getDepartmentWithMembers(department._id), "Department updated"));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

router.post("/:id/members", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "user_ids phai la mang khong rong",
      });
    }

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { member_ids: { $each: user_ids } } },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Phong ban khong ton tai",
      });
    }

    await createActivityLog(
      ActivityLog,
      req.user.userId,
      "add_department_members",
      "Department",
      department._id,
      { added_user_ids: user_ids, member_count: department.member_ids.length }
    );

    res.json(formatResponse(true, await getDepartmentWithMembers(department._id), "Members added"));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

router.delete("/:id/members/:userId", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { id, userId } = req.params;

    const existingDepartment = await Department.findById(id).select("manager_id");
    if (!existingDepartment) {
      return res.status(404).json({
        success: false,
        message: "Phong ban khong ton tai",
      });
    }

    if (existingDepartment.manager_id?.toString() === userId) {
      return res.status(409).json({
        success: false,
        message: "Khong the xoa manager cua phong ban. Hay chi dinh manager khac truoc.",
      });
    }

    const department = await Department.findByIdAndUpdate(
      id,
      { $pull: { member_ids: userId } },
      { new: true }
    );

    await createActivityLog(
      ActivityLog,
      req.user.userId,
      "remove_department_member",
      "Department",
      department._id,
      { removed_user_id: userId, member_count: department.member_ids.length }
    );

    res.json(formatResponse(true, await getDepartmentWithMembers(department._id), "Member removed"));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

router.delete("/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Phong ban khong ton tai",
      });
    }

    await createActivityLog(
      ActivityLog,
      req.user.userId,
      "delete_department",
      "Department",
      department._id,
      { name: department.name, code: department.code }
    );

    res.json(formatResponse(true, null, "Department deleted"));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

module.exports = router;
