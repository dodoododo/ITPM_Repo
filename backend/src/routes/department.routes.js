/**
 * DEPARTMENT MANAGEMENT ROUTES
 * Quản lý phòng ban và thành viên
 */

const express = require('express');
const { Department, User } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { formatResponse, formatErrorResponse, createActivityLog } = require('../utils/apiHelpers');

const router = express.Router();

/**
 * GET /api/departments
 * Lấy danh sách tất cả phòng ban (kèm member count)
 * 
 * Response: { success: true, data: [ departments ] }
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const departments = await Department.find()
      .populate('member_ids', 'full_name email avatar')
      .sort({ createdAt: -1 });

    // Thêm member_count vào response
    const departmentsWithCount = departments.map(dept => ({
      ...dept.toObject(),
      member_count: dept.member_ids?.length || 0
    }));

    res.json(formatResponse(true, departmentsWithCount));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

/**
 * GET /api/departments/:id
 * Lấy chi tiết phòng ban
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('member_ids', 'full_name email avatar role');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Phòng ban không tồn tại'
      });
    }

    res.json(formatResponse(true, {
      ...department.toObject(),
      member_count: department.member_ids?.length || 0
    }));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

/**
 * POST /api/departments
 * Tạo phòng ban mới
 * 
 * Requires: Admin role
 * Body: { name: string, description?: string, color?: string }
 * Response: { success: true, data: { department } }
 */
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Tên phòng ban là bắt buộc'
      });
    }

    const department = new Department({
      name,
      description: description || '',
      color: color || '#2563EB',
      member_ids: []
    });

    await department.save();

    // Log activity
    await createActivityLog(
      require('../models').ActivityLog,
      req.user.userId,
      'tạo phòng ban',
      'Department',
      department._id,
      { name, color }
    );

    res.status(201).json(
      formatResponse(true, department, 'Phòng ban đã được tạo')
    );
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

/**
 * PATCH /api/departments/:id
 * Cập nhật thông tin phòng ban
 * 
 * Requires: Admin role
 * Body: { name?, description?, color? }
 */
router.patch('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, description, color } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color) updateData.color = color;

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('member_ids', 'full_name email avatar');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Phòng ban không tồn tại'
      });
    }

    res.json(formatResponse(true, department, 'Phòng ban đã được cập nhật'));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

/**
 * POST /api/departments/:id/members
 * Thêm thành viên vào phòng ban
 * 
 * Requires: Admin role
 * Body: { user_ids: [ string ] }
 * 
 * Logic: Sử dụng $addToSet để thêm (tránh duplicate)
 * Response: { success: true, data: { department } }
 */
router.post('/:id/members', verifyToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'user_ids phải là mảng không rỗng'
      });
    }

    // Sử dụng $addToSet để thêm (tránh duplicate)
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: { member_ids: { $each: user_ids } }
      },
      { new: true }
    ).populate('member_ids', 'full_name email avatar');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Phòng ban không tồn tại'
      });
    }

    // Log activity
    await createActivityLog(
      require('../models').ActivityLog,
      req.user.userId,
      'thêm thành viên vào phòng ban',
      'Department',
      department._id,
      { added_user_ids: user_ids, member_count: department.member_ids.length }
    );

    res.json(
      formatResponse(true, department, 'Thành viên đã được thêm')
    );
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

/**
 * DELETE /api/departments/:id/members/:userId
 * Xóa thành viên khỏi phòng ban
 * 
 * Requires: Admin role
 * 
 * Logic: Sử dụng $pull để xóa khỏi mảng
 * Response: { success: true, data: { department } }
 */
router.delete('/:id/members/:userId', verifyToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id, userId } = req.params;

    const department = await Department.findByIdAndUpdate(
      id,
      { $pull: { member_ids: userId } },
      { new: true }
    ).populate('member_ids', 'full_name email avatar');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Phòng ban không tồn tại'
      });
    }

    // Log activity
    await createActivityLog(
      require('../models').ActivityLog,
      req.user.userId,
      'xóa thành viên khỏi phòng ban',
      'Department',
      department._id,
      { removed_user_id: userId, member_count: department.member_ids.length }
    );

    res.json(
      formatResponse(true, department, 'Thành viên đã bị xóa')
    );
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

/**
 * DELETE /api/departments/:id
 * Xóa phòng ban
 * 
 * Requires: Admin role
 */
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Phòng ban không tồn tại'
      });
    }

    // Log activity
    await createActivityLog(
      require('../models').ActivityLog,
      req.user.userId,
      'xóa phòng ban',
      'Department',
      department._id,
      { name: department.name }
    );

    res.json(formatResponse(true, null, 'Phòng ban đã được xóa'));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

module.exports = router;
