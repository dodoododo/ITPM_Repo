/**
 * AUTHENTICATION ROUTES
 * POST /api/auth/login - Login
 */

const express = require('express');
const { User } = require('../models');
const { comparePassword, generateJWT } = require('../utils/authHelpers');
const { formatResponse, formatErrorResponse } = require('../utils/apiHelpers');

const router = express.Router();

/**
 * POST /api/auth/login
 * Đăng nhập với email và password
 * 
 * Body: { email: string, password: string }
 * Response: { success: true, data: { user, token } }
 */
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    // Validate input
    if (!email || !password) {
      return res.status(400).json(
        formatErrorResponse(new Error('Email và password là bắt buộc'), 400).body
      );
    }

    // Tìm user bằng email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json(
        formatErrorResponse(new Error('Email hoặc password không đúng'), 401).body
      );
    }

    // Kiểm tra account có bị khóa không
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa. Liên hệ quản trị viên.'
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json(
        formatErrorResponse(new Error('Email hoặc password không đúng'), 401).body
      );
    }

    // Tạo JWT token
    const token = generateJWT(user._id.toString(), user.role);

    // Response (không gửi password)
    const userResponse = {
      _id: user._id,
      full_name: user.full_name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isActive: user.isActive
    };

    res.json(formatResponse(true, { user: userResponse, token }, 'Đăng nhập thành công'));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

module.exports = router;
