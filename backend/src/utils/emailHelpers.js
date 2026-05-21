const nodemailer = require('nodemailer');

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getMailConfigStatus = () => {
  const missing = [];
  if (!process.env.SMTP_HOST) missing.push('SMTP_HOST');
  if (!process.env.SMTP_PORT) missing.push('SMTP_PORT');
  if (!process.env.SMTP_USER) missing.push('SMTP_USER');
  if (!process.env.SMTP_PASS) missing.push('SMTP_PASS');
  if (!process.env.SMTP_FROM) missing.push('SMTP_FROM');

  return {
    configured: missing.length === 0,
    missing,
    provider: process.env.MAIL_PROVIDER || 'smtp',
    from: process.env.SMTP_FROM || '',
  };
};

const createMailConfigError = () => {
  const status = getMailConfigStatus();
  const error = new Error(`Mail provider is not configured. Missing: ${status.missing.join(', ')}`);
  error.code = 'MAIL_NOT_CONFIGURED';
  error.statusCode = 503;
  error.details = status;
  return error;
};

const createTransporter = () => {
  const status = getMailConfigStatus();
  if (!status.configured) {
    throw createMailConfigError();
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendMail = async (mailOptions) => {
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    ...mailOptions,
    from: process.env.SMTP_FROM,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
  };
};

const sendInvitationEmail = async ({ toEmail, invitationToken, invitedByName = 'Admin', fullName = '' }) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const acceptUrl = `${frontendUrl}/accept-invite?token=${encodeURIComponent(invitationToken)}`;

  const safeEmail = escapeHtml(toEmail);
  const safeFullName = escapeHtml(fullName || toEmail);
  const safeInvitedBy = escapeHtml(invitedByName);
  const safeAcceptUrl = escapeHtml(acceptUrl);

  return sendMail({
    to: toEmail,
    subject: 'Activate your ITPM account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #111827;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Activate your ITPM account</h1>
        <p style="font-size: 14px; color: #4b5563;">
          ${safeInvitedBy} created an internal account for ${safeFullName}.
        </p>
        <p style="font-size: 14px; color: #4b5563;">
          Company email: <strong>${safeEmail}</strong>
        </p>
        <a href="${safeAcceptUrl}" style="background: #2563eb; color: #ffffff; padding: 12px 18px; border-radius: 6px; display: inline-block; text-decoration: none; font-weight: 700;">
          Set password and activate
        </a>
        <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
          This activation link expires. If the button does not work, open this link: ${safeAcceptUrl}
        </p>
      </div>
    `,
    text: [
      'Activate your ITPM account',
      '',
      `${invitedByName} created an internal account for ${fullName || toEmail}.`,
      `Company email: ${toEmail}`,
      `Activation link: ${acceptUrl}`,
      '',
      'This activation link expires.',
    ].join('\n'),
  });
};

const sendPasswordResetEmail = async ({ toEmail, resetToken, fullName = '' }) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const safeName = escapeHtml(fullName || toEmail);
  const safeResetUrl = escapeHtml(resetUrl);

  return sendMail({
    to: toEmail,
    subject: 'Reset your ITPM password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #111827;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Reset your password</h1>
        <p style="font-size: 14px; color: #4b5563;">
          Hi ${safeName}, use the button below to set a new password.
        </p>
        <a href="${safeResetUrl}" style="background: #2563eb; color: #ffffff; padding: 12px 18px; border-radius: 6px; display: inline-block; text-decoration: none; font-weight: 700;">
          Reset password
        </a>
        <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
          This link expires soon. If the button does not work, open this link: ${safeResetUrl}
        </p>
      </div>
    `,
    text: [
      'Reset your ITPM password',
      '',
      `Hi ${fullName || toEmail}, use this link to set a new password:`,
      resetUrl,
      '',
      'This link expires soon.',
    ].join('\n'),
  });
};

const sendTaskReviewEmail = async ({ toEmail, taskTitle, actionUrl, subject, message }) => {
  if (!toEmail) return null;

  return sendMail({
    to: toEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #111827;">
        <h1 style="font-size: 22px; margin-bottom: 8px;">${escapeHtml(subject)}</h1>
        <p style="font-size: 14px; color: #4b5563;">${escapeHtml(message || taskTitle)}</p>
        <a href="${escapeHtml(actionUrl)}" style="background: #2563eb; color: #ffffff; padding: 12px 18px; border-radius: 6px; display: inline-block; text-decoration: none; font-weight: 700;">
          Open task
        </a>
      </div>
    `,
    text: [subject, '', message || taskTitle, actionUrl].join('\n'),
  });
};

module.exports = {
  getMailConfigStatus,
  sendInvitationEmail,
  sendPasswordResetEmail,
  sendTaskReviewEmail,
};
