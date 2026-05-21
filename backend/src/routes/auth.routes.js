/**
 * AUTHENTICATION ROUTES
 * POST /api/auth/login - Login
 * POST /api/auth/change-password - First-login password change
 */

const express = require('express');
const { User, Invitation, ActivityLog } = require('../models');
const {
  comparePassword,
  generateJWT,
  generateRefreshToken,
  generatePasswordChangeToken,
  generateSecureToken,
  hashToken,
  hashPassword,
  validatePasswordStrength,
  verifyJWT,
} = require('../utils/authHelpers');
const { formatResponse, formatErrorResponse } = require('../utils/apiHelpers');
const { sendPasswordResetEmail } = require('../utils/emailHelpers');

const router = express.Router();

const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const setSessionCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, accessCookieOptions);
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);
};

const buildUserResponse = (user) => ({
  _id: user._id,
  id: user._id.toString(),
  full_name: user.full_name,
  email: user.email,
  company_email: user.company_email,
  notification_email: user.notification_email,
  avatar: user.avatar,
  role: user.role,
  isActive: user.isActive,
  account_status: user.account_status,
  invitationStatus: user.invitationStatus,
  hasChangedPassword: user.hasChangedPassword,
  mustChangePassword: !user.hasChangedPassword,
  department_id: user.department_id,
  position_title: user.position_title,
  manager_id: user.manager_id,
  lastLoginAt: user.lastLoginAt,
});

const issueSession = (res, user) => {
  const accessToken = generateJWT(user._id.toString(), user.role, user.tokenVersion || 0);
  const refreshToken = generateRefreshToken(user._id.toString(), user.tokenVersion || 0);
  setSessionCookies(res, accessToken, refreshToken);
  return accessToken;
};

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 */
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json(
        formatErrorResponse(new Error('Email and password are required'), 400).body
      );
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json(
        formatErrorResponse(new Error('Email or password is incorrect'), 401).body
      );
    }

    if (!user.isActive || ['locked', 'disabled'].includes(user.account_status)) {
      return res.status(403).json({
        success: false,
        message: 'Account is locked. Please contact an administrator.',
      });
    }

    if (user.account_status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Account has not been activated. Please use the invitation email.',
      });
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      user.lastLoginAttemptAt = new Date();
      await user.save();

      return res.status(401).json(
        formatErrorResponse(new Error('Email or password is incorrect'), 401).body
      );
    }

    user.loginAttempts = 0;
    user.lastLoginAttemptAt = new Date();

    if (!user.hasChangedPassword) {
      await user.save();
      const passwordChangeToken = generatePasswordChangeToken(user._id.toString());

      return res.json(
        formatResponse(
          true,
          {
            user: buildUserResponse(user),
            requiresPasswordChange: true,
            passwordChangeToken,
          },
          'Password change required'
        )
      );
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = issueSession(res, user);

    res.json(
      formatResponse(
        true,
        { user: buildUserResponse(user), token, requiresPasswordChange: false },
        'Login successful'
      )
    );
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

/**
 * POST /api/auth/change-password
 * Body: { passwordChangeToken: string, newPassword: string }
 */
router.post('/change-password', async (req, res) => {
  try {
    const { passwordChangeToken, newPassword } = req.body;

    if (!passwordChangeToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password change token and new password are required',
      });
    }

    const decoded = verifyJWT(passwordChangeToken);
    if (!decoded || decoded.purpose !== 'first_login_password_change') {
      return res.status(401).json({
        success: false,
        message: 'Password change session is invalid or expired',
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    if (user.hasChangedPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password has already been changed',
      });
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password is not strong enough',
        errors: passwordValidation.errors,
      });
    }

    const isSamePassword = await comparePassword(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from the temporary password',
      });
    }

    user.password = await hashPassword(newPassword);
    user.hasChangedPassword = true;
    user.invitationStatus = 'accepted';
    user.account_status = 'active';
    user.isActive = true;
    user.lastLoginAt = new Date();
    user.loginAttempts = 0;
    await user.save();

    await Invitation.findOneAndUpdate(
      { email: user.email, status: 'pending' },
      { status: 'accepted' }
    );

    const token = issueSession(res, user);

    res.json(
      formatResponse(
        true,
        { user: buildUserResponse(user), token, requiresPasswordChange: false },
        'Password changed successfully'
      )
    );
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

router.post('/forgot-password', async (req, res) => {
  const genericMessage = 'If the email exists in the system, password reset instructions have been sent.';

  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (!user || user.account_status === 'disabled') {
      return res.json(formatResponse(true, null, genericMessage));
    }

    const resetToken = generateSecureToken();
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    user.passwordResetUsedAt = null;
    await user.save();

    try {
      await sendPasswordResetEmail({
        toEmail: user.notification_email || user.email,
        resetToken,
        fullName: user.full_name,
      });

      await ActivityLog.create({
        user_id: user._id,
        action: 'password_reset_email_sent',
        target_type: 'User',
        target_id: user._id,
        details: { email: user.email },
      });
    } catch (mailError) {
      await ActivityLog.create({
        user_id: user._id,
        action: 'password_reset_email_failed',
        target_type: 'User',
        target_id: user._id,
        details: { email: user.email, error: mailError.message },
      });

      if (mailError.code === 'MAIL_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: 'Mail provider is not configured. Please contact an administrator.',
          data: mailError.details,
        });
      }

      throw mailError;
    }

    res.json(formatResponse(true, null, genericMessage));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and newPassword are required' });
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password is not strong enough',
        errors: passwordValidation.errors,
      });
    }

    const user = await User.findOne({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: { $gt: new Date() },
      passwordResetUsedAt: null,
    });

    if (!user || user.account_status === 'disabled') {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or expired',
      });
    }

    user.password = await hashPassword(newPassword);
    user.hasChangedPassword = true;
    user.passwordResetUsedAt = new Date();
    user.passwordResetTokenHash = '';
    user.passwordResetExpiresAt = null;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    if (user.account_status === 'pending') {
      user.account_status = 'active';
      user.isActive = true;
      user.invitationStatus = 'accepted';
    }
    await user.save();

    await ActivityLog.create({
      user_id: user._id,
      action: 'password_reset_completed',
      target_type: 'User',
      target_id: user._id,
      details: { email: user.email },
    });

    res.json(formatResponse(true, null, 'Password has been reset'));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

module.exports = router;
