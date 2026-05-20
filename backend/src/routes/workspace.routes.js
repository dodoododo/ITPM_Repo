const express = require("express");
const { User, Invitation, Department, ActivityLog } = require("../models");
const { verifyToken, requireRole } = require("../middleware/auth.middleware");
const {
  hashPassword,
  generateJWT,
  generateInvitationToken,
  calculateInvitationExpiry,
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

router.post("/invite", verifyToken, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const { role = "employee", department_id } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!["admin", "manager", "employee"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    if (department_id) {
      const departmentExists = await Department.exists({ _id: department_id });
      if (!departmentExists) {
        return res.status(404).json({
          success: false,
          message: "Department not found",
        });
      }
    }

    await expirePendingInvitations();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const pendingInvitation = await Invitation.findOne({
      email,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    if (pendingInvitation) {
      return res.status(400).json({
        success: false,
        message: "A pending invitation already exists for this email",
      });
    }

    const token = generateInvitationToken();
    const expiresAt = calculateInvitationExpiry(7);
    let invitation = await Invitation.findOne({ email });

    if (invitation) {
      invitation.token = token;
      invitation.role = role;
      invitation.department_id = department_id || undefined;
      invitation.status = "pending";
      invitation.expiresAt = expiresAt;
      await invitation.save();
    } else {
      invitation = await Invitation.create({
        email,
        token,
        role,
        department_id,
        status: "pending",
        expiresAt,
      });
    }

    await sendInvitationEmail(email, token, req.user.userId);

    await createActivityLog(
      ActivityLog,
      req.user.userId,
      "send_invitation",
      "User",
      invitation._id,
      { invited_email: email, role, department_id }
    );

    res.status(201).json(formatResponse(true, invitation, "Invitation sent"));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

router.post("/accept-invite", async (req, res) => {
  try {
    const { token, full_name, password } = req.body;

    if (!token || !full_name || !password) {
      return res.status(400).json({
        success: false,
        message: "Token, full_name and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const invitation = await Invitation.findOne({
      token,
      status: "pending",
    });

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: "Invitation is invalid or already used",
      });
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = "expired";
      await invitation.save();
      return res.status(400).json({
        success: false,
        message: "Invitation has expired",
      });
    }

    const existingUser = await User.findOne({ email: invitation.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const user = await User.create({
      full_name: full_name.trim(),
      email: invitation.email,
      password: await hashPassword(password),
      role: invitation.role,
      isActive: true,
      invitationStatus: "accepted",
    });

    if (invitation.department_id) {
      await Department.findByIdAndUpdate(invitation.department_id, {
        $addToSet: { member_ids: user._id },
      });
    }

    invitation.status = "accepted";
    await invitation.save();

    const jwtToken = generateJWT(user._id.toString(), user.role);
    const userResponse = {
      _id: user._id,
      full_name: user.full_name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isActive: user.isActive,
    };

    res
      .status(201)
      .json(formatResponse(true, { user: userResponse, token: jwtToken }, "Account created"));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

router.get("/invitations", verifyToken, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const { status } = req.query;
    await expirePendingInvitations();

    const filter = status ? { status } : {};
    const invitations = await Invitation.find(filter)
      .populate("department_id", "name color")
      .sort({ createdAt: -1 });

    res.json(formatResponse(true, invitations));
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    res.status(statusCode).json(body);
  }
});

module.exports = router;
