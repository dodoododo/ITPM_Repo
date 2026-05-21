/**
 * JWT MIDDLEWARE
 * Verify JWT Token từ Authorization header
 */

const { verifyJWT } = require('../utils/authHelpers');
const { User } = require('../models');

const getCookieValue = (cookieHeader, name) => {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const target = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!target) return null;

  return decodeURIComponent(target.slice(name.length + 1));
};

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return getCookieValue(req.headers.cookie, 'accessToken');
};

/**
 * Middleware xác thực JWT
 * Usage: router.get('/protected', verifyToken, (req, res) => { ... })
 * 
 * Expects: Authorization header với format "Bearer <token>"
 * Sets: req.user = { userId, role }
 */
const verifyToken = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không có token hoặc format không đúng'
      });
    }

    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    const user = await User.findById(decoded.userId).select('_id role isActive account_status full_name email hasChangedPassword tokenVersion');
    if (!user || !user.isActive || ['locked', 'disabled', 'pending'].includes(user.account_status)) {
      return res.status(401).json({
        success: false,
        message: 'Token khong hop le hoac tai khoan da bi khoa'
      });
    }

    if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked'
      });
    }

    if (!user.hasChangedPassword) {
      return res.status(403).json({
        success: false,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'User must change the temporary password before continuing'
      });
    }

    req.user = {
      userId: user._id.toString(),
      role: user.role,
      full_name: user.full_name,
      email: user.email,
      hasChangedPassword: user.hasChangedPassword
    };
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
