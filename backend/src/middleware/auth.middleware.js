/**
 * JWT MIDDLEWARE
 * Verify JWT Token từ Authorization header
 */

const { verifyJWT } = require('../utils/authHelpers');

/**
 * Middleware xác thực JWT
 * Usage: router.get('/protected', verifyToken, (req, res) => { ... })
 * 
 * Expects: Authorization header với format "Bearer <token>"
 * Sets: req.user = { userId, role }
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Không có token hoặc format không đúng'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Middleware kiểm tra role
 * Usage: router.delete('/admin', verifyToken, requireRole('admin'), (req, res) => { ... })
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực'
      });
    }

    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!rolesArray.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Quyền bị từ chối. Yêu cầu role: ${rolesArray.join(' hoặc ')}`
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  requireRole
};
