/**
 * EMAIL HELPERS
 * Gửi email sử dụng Nodemailer
 * 
 * NOTE: Cần setup Nodemailer config với SMTP credentials
 * Hiện tại mới là skeleton, cần điền SMTP config vào .env
 */

const nodemailer = require('nodemailer');

/**
 * Tạo transporter Nodemailer
 * Sửa lại với SMTP config thực tế của công ty
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || 'your_email@gmail.com',
      pass: process.env.SMTP_PASS || 'your_app_password'
    }
  });
};

/**
 * Gửi email mời nhân sự
 * @param {string} toEmail - Email người nhận
 * @param {string} invitationToken - Token từ database
 * @param {string} invitedByName - Tên người gửi lời mời
 * @returns {Promise<boolean>}
 */
const sendInvitationEmail = async (toEmail, invitationToken, invitedByName = 'Admin') => {
  try {
    const transporter = createTransporter();

    const acceptUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${invitationToken}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject: '🎉 Bạn được mời tham gia ITPM Workspace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Chào mừng bạn đến với ITPM! 👋</h2>
          <p><strong>${invitedByName}</strong> đã mời bạn tham gia Workspace.</p>
          
          <p>Click nút bên dưới để kích hoạt tài khoản:</p>
          
          <a href="${acceptUrl}" style="
            background-color: #3B82F6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            display: inline-block;
            margin: 20px 0;
          ">
            ✨ Kích hoạt Tài khoản
          </a>
          
          <p>Hoặc copy link này vào trình duyệt:</p>
          <p style="word-break: break-all; color: #666;">${acceptUrl}</p>
          
          <p>Link này sẽ hết hạn sau 7 ngày.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">
            Nếu bạn không mong đợi email này, vui lòng bỏ qua.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Invitation email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending invitation email:', error.message);
    return false;
  }
};

module.exports = {
  sendInvitationEmail
};
