/**
 * USER MANAGEMENT ROUTES
 * Quản lý users (deactivate, update profile, etc.)
 */

const express = require('express');
const { User } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { formatResponse, formatErrorResponse, createActivityLog } = require('../utils/apiHelpers');

const router = express.Router();

/**
 * GET /api/users
 * Lấy danh sách tất cả users
 * 
 * Requires: Admin role
 * Response: { success: true, data: [ users ] }
 */
router.get('/', verifyToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(formatResponse(true, users));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

/**
 * GET /api/users/:id
 * Lấy thông tin user
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User không tồn tại'
      });
    }

    res.json(formatResponse(true, user));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

/**
 * PATCH /api/users/:id/status
 * Khóa/Mở tài khoản (isActive: true/false)
 * 
 * Requires: Admin role
 * Body: { isActive: boolean }
 * Response: { success: true, data: { user } }
 */
router.patch('/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive phải là true hoặc false'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User không tồn tại'
      });
    }

    // Log activity
    await createActivityLog(
      require('../models').ActivityLog,
      req.user.userId,
      `${isActive ? 'kích hoạt' : 'khóa'} tài khoản`,
      'User',
      user._id,
      { isActive }
    );

    res.json(
      formatResponse(true, user, `Tài khoản đã được ${isActive ? 'kích hoạt' : 'khóa'}`)
    );
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

/**
 * PATCH /api/users/:id
 * Cập nhật thông tin user
 * 
 * Body: { full_name, avatar } (không thể update email, role, password từ đây)
 */
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const { full_name, avatar } = req.body;

    // Chỉ cho phép update field này
    const updateData = {};
    if (full_name) updateData.full_name = full_name;
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User không tồn tại'
      });
    }

    res.json(formatResponse(true, user, 'Thông tin đã được cập nhật'));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

module.exports = router;
