const express = require("express");
const { User, Invitation, Department, ActivityLog } = require("../models");
const { verifyToken, requireRole } = require("../middleware/auth.middleware");
const {
  hashPassword,
  generateJWT,
  generateRefreshToken,
  generateInvitationToken,
  calculateInvitationExpiry,
  validatePasswordStrength,
} = require("../utils/authHelpers");
const { sendInvitationEmail } = require("../utils/emailHelpers");
const {
  formatResponse,
  formatErrorResponse,
  createActivityLog,
} = require("../utils/apiHelpers");

const router = express.Router();

const expirePendingInvitations = () =>
  Invitation.updateMany(
    { status: "pending", expiresAt: { $lte: new Date() } },
    { $set: { status: "expired" } }
  );

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");

const publicUserFields = "_id full_name email company_email notification_email avatar role isActive account_status invitationStatus hasChangedPassword department_id position_title manager_id created_by createdAt updatedAt lastLoginAt";

router.post("/invite", verifyToken, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const {
      full_name,
      role = "employee",
      department_id,
      position_title = "",
      manager_id,
      notification_email,
    } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "A valid company email is required" });
    }

    if (!full_name || full_name.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Full name is required" });
    }

    const allowedRoles = req.user.role === "admin" ? ["admin", "manager", "employee"] : ["employee"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Role is not allowed" });
    }

    if (notification_email && !isValidEmail(notification_email)) {
      return res.status(400).json({ success: false, message: "Notification email is invalid" });
    }

    if (department_id) {
      const departmentExists = await Department.exists({ _id: department_id });
      if (!departmentExists) {
        return res.status(404).json({ success: false, message: "Department not found" });
      }
    }

    if (manager_id) {
      const managerExists = await User.exists({ _id: manager_id, role: { $in: ["admin", "manager"] } });
      if (!managerExists) {
        return res.status(404).json({ success: false, message: "Direct manager not found" });
      }
    }

    await expirePendingInvitations();

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.account_status !== "pending") {
      return res.status(400).json({ success: false, message: "Email is already registered" });
    }

    const token = generateInvitationToken();
    const expiresAt = calculateInvitationExpiry(7);
    const pendingPasswordHash = await hashPassword(generateInvitationToken());

    const user = existingUser || await User.create({
      full_name: full_name.trim(),
      email,
      company_email: email,
      notification_email: notification_email?.trim().toLowerCase() || email,
      password: pendingPasswordHash,
      role,
      isActive: false,
      account_status: "pending",
      invitationStatus: "pending",
      hasChangedPassword: false,
      department_id: department_id || undefined,
      position_title: position_title.trim(),
      manager_id: manager_id || undefined,
      created_by: req.user.userId,
    });

    if (existingUser) {
      existingUser.full_name = full_name.trim();
      existingUser.company_email = email;
      existingUser.notification_email = notification_email?.trim().toLowerCase() || existingUser.notification_email || email;
      existingUser.role = role;
      existingUser.department_id = department_id || undefined;
      existingUser.position_title = position_title.trim();
      existingUser.manager_id = manager_id || undefined;
      existingUser.invitationStatus = "pending";
      existingUser.account_status = "pending";
      existingUser.isActive = false;
      await existingUser.save();
    }

    if (department_id) {
      await Department.findByIdAndUpdate(department_id, { $addToSet: { member_ids: user._id } });
    }

    const invitation = await Invitation.findOneAndUpdate(
      { email },
      {
        email,
        token,
        role,
        department_id: department_id || undefined,
        user_id: user._id,
        created_by: req.user.userId,
        status: "pending",
        expiresAt,
        sentAt: null,
        lastSendError: "",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      const emailInfo = await sendInvitationEmail({
        toEmail: email,
        invitationToken: token,
        invitedByName: req.user.full_name || "Admin",
        fullName: user.full_name,
      });

      invitation.sentAt = new Date();
      invitation.lastSendError = "";
      await invitation.save();

      await createActivityLog(ActivityLog, req.user.userId, "send_invitation", "User", user._id, {
        invited_email: email,
        full_name: user.full_name,
        role,
        department_id,
        mail_message_id: emailInfo?.messageId,
      });
    } catch (mailError) {
      invitation.lastSendError = mailError.message;
      await invitation.save();

      await createActivityLog(ActivityLog, req.user.userId, "send_invitation_failed", "User", user._id, {
        invited_email: email,
        role,
        department_id,
        error: mailError.message,
      });

      return res.status(mailError.statusCode || 502).json({
        success: false,
        message: mailError.code === "MAIL_NOT_CONFIGURED"
          ? "Mail provider is not configured. Please configure SMTP before inviting users."
          : `Invitation email could not be sent: ${mailError.message}`,
        data: mailError.details || null,
      });
    }

    const safeUser = await User.findById(user._id).select(publicUserFields)
      .populate("department_id", "name code color")
      .populate("manager_id", "full_name email")
      .populate("created_by", "full_name email");

    res.status(201).json(formatResponse(true, {
      user: safeUser,
      invitation,
      email_sent: true,
    }, "Invitation email was sent successfully"));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

router.post("/accept-invite", async (req, res) => {
  try {
    const { token, full_name, password } = req.body;

    if (!token || !full_name || !password) {
      return res.status(400).json({ success: false, message: "Token, full name and password are required" });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Password is not strong enough",
        errors: passwordValidation.errors,
      });
    }

    const invitation = await Invitation.findOne({ token, status: "pending" });
    if (!invitation) {
      return res.status(400).json({ success: false, message: "Invitation is invalid or already used" });
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = "expired";
      await invitation.save();
      await User.findOneAndUpdate({ email: invitation.email, account_status: "pending" }, {
        invitationStatus: "expired",
      });
      return res.status(400).json({ success: false, message: "Invitation has expired. Ask an admin to resend it." });
    }

    let user = invitation.user_id
      ? await User.findById(invitation.user_id)
      : await User.findOne({ email: invitation.email });

    if (!user) {
      user = await User.create({
        full_name: full_name.trim(),
        email: invitation.email,
        company_email: invitation.email,
        notification_email: invitation.email,
        password: await hashPassword(password),
        role: invitation.role,
        department_id: invitation.department_id,
        isActive: true,
        account_status: "active",
        invitationStatus: "accepted",
        hasChangedPassword: true,
        lastLoginAt: new Date(),
      });
    } else {
      if (user.account_status !== "pending" && user.invitationStatus === "accepted") {
        return res.status(400).json({ success: false, message: "Invitation has already been accepted" });
      }

      user.full_name = full_name.trim();
      user.password = await hashPassword(password);
      user.isActive = true;
      user.account_status = "active";
      user.invitationStatus = "accepted";
      user.hasChangedPassword = true;
      user.lastLoginAt = new Date();
      user.loginAttempts = 0;
      await user.save();
    }

    if (invitation.department_id) {
      await Department.findByIdAndUpdate(invitation.department_id, { $addToSet: { member_ids: user._id } });
    }

    invitation.status = "accepted";
    await invitation.save();

    const accessToken = generateJWT(user._id.toString(), user.role, user.tokenVersion || 0);
    const refreshToken = generateRefreshToken(user._id.toString(), user.tokenVersion || 0);

    await createActivityLog(ActivityLog, user._id, "account_activated", "User", user._id, {
      email: user.email,
      role: user.role,
      department_id: invitation.department_id,
    });

    const userResponse = await User.findById(user._id).select(publicUserFields)
      .populate("department_id", "name code color")
      .populate("manager_id", "full_name email")
      .populate("created_by", "full_name email");

    res
      .status(201)
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      .json(formatResponse(true, { user: userResponse, token: accessToken }, "Account activated"));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

router.get("/invitations", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { status } = req.query;
    await expirePendingInvitations();

    const filter = status ? { status } : {};
    const invitations = await Invitation.find(filter)
      .populate("department_id", "name color code")
      .populate("user_id", "full_name email account_status")
      .populate("created_by", "full_name email")
      .sort({ createdAt: -1 });

    res.json(formatResponse(true, invitations));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error, error.statusCode || 500);
    res.status(statusCode).json(body);
  }
});

module.exports = router;
