const express = require('express');
const { User, Project, Department, Invitation, ActivityLog } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { formatResponse, formatErrorResponse, createActivityLog } = require('../utils/apiHelpers');
const {
  hashPassword,
  generateInvitationToken,
  calculateInvitationExpiry,
  generateSecureToken,
  hashToken,
} = require('../utils/authHelpers');
const { sendInvitationEmail, sendPasswordResetEmail, getMailConfigStatus } = require('../utils/emailHelpers');
const {
  deny,
  getUserDepartmentIds,
  isAdmin,
  isManager,
  sameId,
} = require('../utils/rbac');

const router = express.Router();

const publicUserFields = '_id full_name email company_email notification_email avatar role isActive account_status invitationStatus hasChangedPassword department_id position_title manager_id created_by createdAt updatedAt lastLoginAt';

const populateUser = (query) =>
  query
    .select(publicUserFields)
    .populate('department_id', 'name code color')
    .populate('manager_id', 'full_name email role')
    .populate('created_by', 'full_name email');

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');

const normalizeEmail = (email) => email?.trim().toLowerCase();

const getUserId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  if (value.id) return value.id.toString();
  return value.toString();
};

const setAccountStatus = (user, status) => {
  user.account_status = status;
  user.isActive = status === 'active';
  if (status === 'pending') {
    user.invitationStatus = 'pending';
  }
  if (status === 'active') {
    user.invitationStatus = user.invitationStatus === 'pending' ? 'accepted' : user.invitationStatus;
  }
  if (['locked', 'disabled'].includes(status)) {
    user.tokenVersion = (user.tokenVersion || 0) + 1;
  }
};

const assertDepartment = async (departmentId) => {
  if (!departmentId) return;
  const exists = await Department.exists({ _id: departmentId });
  if (!exists) {
    const error = new Error('Department not found');
    error.statusCode = 404;
    throw error;
  }
};

const assertManager = async (managerId) => {
  if (!managerId) return;
  const exists = await User.exists({ _id: managerId, role: { $in: ['admin', 'manager'] } });
  if (!exists) {
    const error = new Error('Direct manager not found');
    error.statusCode = 404;
    throw error;
  }
};

router.get('/admin/config-status', verifyToken, requireRole('admin'), async (_req, res) => {
  res.json(formatResponse(true, {
    mail: getMailConfigStatus(),
    google_workspace: {
      configured: Boolean(process.env.GOOGLE_WORKSPACE_CLIENT_EMAIL && process.env.GOOGLE_WORKSPACE_PRIVATE_KEY && process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL),
      message: 'Automatic company email provisioning is not enabled unless Google Workspace Admin SDK credentials are configured.',
    },
    office_viewer: {
      provider: process.env.OFFICE_VIEWER_PROVIDER || '',
      configured: Boolean(process.env.OFFICE_VIEWER_PROVIDER && process.env.FILE_PUBLIC_BASE_URL),
    },
  }));
});

router.get('/', verifyToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    if (isAdmin(req.user)) {
      const users = await populateUser(User.find().sort({ createdAt: -1 }));
      return res.json(formatResponse(true, users));
    }

    const departmentIds = await getUserDepartmentIds(Department, req.user.userId);
    const [departments, projects] = await Promise.all([
      Department.find({ _id: { $in: departmentIds } }).select('member_ids manager_id').lean(),
      Project.find({
        $or: [
          { owner_id: req.user.userId },
          { department_id: { $in: departmentIds } },
        ],
      }).select('owner_id member_ids').lean(),
    ]);

    const scopedUserIds = new Set([req.user.userId]);
    departments.forEach((department) => {
      scopedUserIds.add(getUserId(department.manager_id));
      (department.member_ids || []).forEach((id) => scopedUserIds.add(getUserId(id)));
    });
    projects.forEach((project) => {
      scopedUserIds.add(getUserId(project.owner_id));
      (project.member_ids || []).forEach((id) => scopedUserIds.add(getUserId(id)));
    });

    const users = await populateUser(User.find({ _id: { $in: [...scopedUserIds].filter(Boolean) } }).sort({ createdAt: -1 }));
    res.json(formatResponse(true, users));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const {
      full_name,
      role = 'employee',
      department_id,
      position_title = '',
      manager_id,
      notification_email,
    } = req.body;

    if (!full_name?.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid company email is required' });
    }
    if (!['admin', 'manager', 'employee'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    if (notification_email && !isValidEmail(notification_email)) {
      return res.status(400).json({ success: false, message: 'Notification email is invalid' });
    }

    await assertDepartment(department_id);
    await assertManager(manager_id);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    const inviteToken = generateInvitationToken();
    const user = await User.create({
      full_name: full_name.trim(),
      email,
      company_email: email,
      notification_email: normalizeEmail(notification_email) || email,
      password: await hashPassword(generateInvitationToken()),
      role,
      isActive: false,
      account_status: 'pending',
      invitationStatus: 'pending',
      hasChangedPassword: false,
      department_id: department_id || undefined,
      position_title: position_title.trim(),
      manager_id: manager_id || undefined,
      created_by: req.user.userId,
    });

    if (department_id) {
      await Department.findByIdAndUpdate(department_id, { $addToSet: { member_ids: user._id } });
    }

    const invitation = await Invitation.findOneAndUpdate(
      { email },
      {
        email,
        token: inviteToken,
        role,
        department_id: department_id || undefined,
        user_id: user._id,
        created_by: req.user.userId,
        status: 'pending',
        expiresAt: calculateInvitationExpiry(7),
        sentAt: null,
        lastSendError: '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      const emailInfo = await sendInvitationEmail({
        toEmail: email,
        invitationToken: inviteToken,
        invitedByName: req.user.full_name || 'Admin',
        fullName: user.full_name,
      });
      invitation.sentAt = new Date();
      await invitation.save();

      await createActivityLog(ActivityLog, req.user.userId, 'create_user_invitation', 'User', user._id, {
        role,
        department_id,
        mail_message_id: emailInfo?.messageId,
      });
    } catch (mailError) {
      invitation.lastSendError = mailError.message;
      await invitation.save();

      await createActivityLog(ActivityLog, req.user.userId, 'create_user_invitation_email_failed', 'User', user._id, {
        role,
        department_id,
        error: mailError.message,
      });

      return res.status(mailError.statusCode || 502).json({
        success: false,
        message: mailError.code === 'MAIL_NOT_CONFIGURED'
          ? 'Mail provider is not configured. Please configure SMTP before creating user invitations.'
          : `Invitation email could not be sent: ${mailError.message}`,
        data: mailError.details || null,
      });
    }

    const safeUser = await populateUser(User.findById(user._id));
    res.status(201).json(formatResponse(true, safeUser, 'User invitation created and email sent'));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const user = await populateUser(User.findById(req.params.id));

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!isAdmin(req.user) && !sameId(req.user.userId, user._id)) {
      if (!isManager(req.user)) {
        return deny(res, 'You do not have access to this user.');
      }

      const departmentIds = await getUserDepartmentIds(Department, req.user.userId);
      const [department, project] = await Promise.all([
        Department.findOne({ _id: { $in: departmentIds }, member_ids: user._id }).select('_id').lean(),
        Project.findOne({
          $or: [
            { owner_id: req.user.userId, member_ids: user._id },
            { department_id: { $in: departmentIds }, member_ids: user._id },
          ],
        }).select('_id').lean(),
      ]);

      if (!department && !project) {
        return deny(res, 'You do not have access to this user.');
      }
    }

    res.json(formatResponse(true, user));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

router.patch('/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const status = req.body.account_status || (typeof req.body.isActive === 'boolean' ? (req.body.isActive ? 'active' : 'locked') : undefined);

    if (!['pending', 'active', 'locked', 'disabled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'account_status must be pending, active, locked or disabled' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const previousStatus = user.account_status;
    setAccountStatus(user, status);
    await user.save();

    await createActivityLog(ActivityLog, req.user.userId, 'update_user_status', 'User', user._id, {
      from_status: previousStatus,
      to_status: status,
    });

    res.json(formatResponse(true, await populateUser(User.findById(user._id)), 'Account status updated'));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const isSelf = sameId(req.user.userId, req.params.id);
    if (!isAdmin(req.user) && !isSelf) {
      return deny(res, 'You can only update your own profile.');
    }

    const existingUser = await User.findById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updates = {};
    if (req.body.full_name?.trim()) updates.full_name = req.body.full_name.trim();
    if (req.body.avatar !== undefined) updates.avatar = req.body.avatar;
    if (req.body.notification_email !== undefined) {
      const nextNotificationEmail = normalizeEmail(req.body.notification_email);
      if (nextNotificationEmail && !isValidEmail(nextNotificationEmail)) {
        return res.status(400).json({ success: false, message: 'Notification email is invalid' });
      }
      updates.notification_email = nextNotificationEmail || existingUser.email;
    }

    if (isAdmin(req.user)) {
      const nextEmail = normalizeEmail(req.body.email);
      if (nextEmail) {
        if (!isValidEmail(nextEmail)) {
          return res.status(400).json({ success: false, message: 'Company email is invalid' });
        }
        const duplicate = await User.findOne({ email: nextEmail, _id: { $ne: existingUser._id } });
        if (duplicate) {
          return res.status(400).json({ success: false, message: 'Email is already used by another user' });
        }
        updates.email = nextEmail;
        updates.company_email = normalizeEmail(req.body.company_email) || nextEmail;
      }

      if (req.body.company_email !== undefined && !nextEmail) {
        const companyEmail = normalizeEmail(req.body.company_email);
        if (companyEmail && !isValidEmail(companyEmail)) {
          return res.status(400).json({ success: false, message: 'Company email is invalid' });
        }
        updates.company_email = companyEmail || existingUser.email;
      }

      if (req.body.role !== undefined) {
        if (!['admin', 'manager', 'employee'].includes(req.body.role)) {
          return res.status(400).json({ success: false, message: 'Invalid role' });
        }
        updates.role = req.body.role;
      }

      if (req.body.department_id !== undefined) {
        await assertDepartment(req.body.department_id);
        updates.department_id = req.body.department_id || undefined;
      }

      if (req.body.manager_id !== undefined) {
        await assertManager(req.body.manager_id);
        updates.manager_id = req.body.manager_id || undefined;
      }

      if (req.body.position_title !== undefined) {
        updates.position_title = req.body.position_title.trim();
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (updates.department_id) {
      await Department.findByIdAndUpdate(updates.department_id, { $addToSet: { member_ids: user._id } });
    }

    await createActivityLog(ActivityLog, req.user.userId, 'update_user_profile', 'User', user._id, {
      fields: Object.keys(updates),
    });

    res.json(formatResponse(true, await populateUser(User.findById(user._id)), 'User updated'));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

router.post('/:id/resend-invite', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.account_status !== 'pending') {
      return res.status(409).json({ success: false, message: 'Only pending accounts can receive invitation emails' });
    }

    const token = generateInvitationToken();
    const invitation = await Invitation.findOneAndUpdate(
      { email: user.email },
      {
        email: user.email,
        token,
        role: user.role,
        department_id: user.department_id || undefined,
        user_id: user._id,
        created_by: req.user.userId,
        status: 'pending',
        expiresAt: calculateInvitationExpiry(7),
        lastSendError: '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      const emailInfo = await sendInvitationEmail({
        toEmail: user.notification_email || user.email,
        invitationToken: token,
        invitedByName: req.user.full_name || 'Admin',
        fullName: user.full_name,
      });
      invitation.sentAt = new Date();
      invitation.lastSendError = '';
      await invitation.save();

      await createActivityLog(ActivityLog, req.user.userId, 'resend_invitation', 'User', user._id, {
        mail_message_id: emailInfo?.messageId,
      });
    } catch (mailError) {
      invitation.lastSendError = mailError.message;
      await invitation.save();
      return res.status(mailError.statusCode || 502).json({
        success: false,
        message: mailError.code === 'MAIL_NOT_CONFIGURED'
          ? 'Mail provider is not configured. Please configure SMTP before resending invitations.'
          : `Invitation email could not be sent: ${mailError.message}`,
        data: mailError.details || null,
      });
    }

    res.json(formatResponse(true, invitation, 'Invitation email resent'));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

router.post('/:id/reset-password', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.account_status === 'disabled') {
      return res.status(409).json({ success: false, message: 'Disabled accounts cannot reset password' });
    }

    const resetToken = generateSecureToken();
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    user.passwordResetUsedAt = null;
    await user.save();

    try {
      const emailInfo = await sendPasswordResetEmail({
        toEmail: user.notification_email || user.email,
        resetToken,
        fullName: user.full_name,
      });

      await createActivityLog(ActivityLog, req.user.userId, 'admin_password_reset_email_sent', 'User', user._id, {
        mail_message_id: emailInfo?.messageId,
      });
    } catch (mailError) {
      await createActivityLog(ActivityLog, req.user.userId, 'admin_password_reset_email_failed', 'User', user._id, {
        error: mailError.message,
      });
      return res.status(mailError.statusCode || 502).json({
        success: false,
        message: mailError.code === 'MAIL_NOT_CONFIGURED'
          ? 'Mail provider is not configured. Please configure SMTP before resetting passwords.'
          : `Password reset email could not be sent: ${mailError.message}`,
        data: mailError.details || null,
      });
    }

    res.json(formatResponse(true, null, 'Password reset email sent'));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

module.exports = router;
