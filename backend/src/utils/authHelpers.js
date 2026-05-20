/**
 * AUTH & JWT UTILITIES
 * Xử lý password hashing, JWT token generation, verification
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * Hash password sử dụng bcrypt
 * @param {string} password - Password cần hash
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * So sánh password với hash
 * @param {string} password - Password nhập vào
 * @param {string} hash - Hash từ database
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Tạo JWT Token
 * @param {string} userId - ID của user
 * @param {string} role - Role của user (admin, manager, employee)
 * @returns {string} - JWT Token
 */
const generateJWT = (userId, role) => {
  const token = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    { expiresIn: '7d' }
  );
  return token;
};

/**
 * Verify JWT Token
 * @param {string} token - JWT Token cần verify
 * @returns {object|null} - Decoded payload hoặc null nếu invalid
 */
const verifyJWT = (token) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_jwt_secret_key_here'
    );
    return decoded;
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    return null;
  }
};

/**
 * Tạo Invitation Token (ngẫu nhiên, không dùng JWT)
 * Dùng cho email invitation links
 * @returns {string} - 32 ký tự hex token
 */
const generateInvitationToken = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Tính hạn sử dụng Invitation (mặc định 7 ngày)
 * @param {number} days - Số ngày hết hạn (default: 7)
 * @returns {Date}
 */
const calculateInvitationExpiry = (days = 7) => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  return expiryDate;
};

module.exports = {
  hashPassword,
  comparePassword,
  generateJWT,
  verifyJWT,
  generateInvitationToken,
  calculateInvitationExpiry
};
