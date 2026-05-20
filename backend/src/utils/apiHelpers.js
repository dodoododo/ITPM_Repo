/**
 * BACKEND UTILITIES
 * Common functions cho API responses, error handling, v.v.
 */

/**
 * Format API Response thành cấu trúc chuẩn
 * @param {boolean} success - Trạng thái thành công
 * @param {any} data - Dữ liệu trả về
 * @param {string} message - Thông báo tùy chỉnh (optional)
 */
const formatResponse = (success, data = null, message = '') => {
  return {
    success,
    data,
    ...(message && { message })
  };
};

/**
 * Format Paginated Response
 * @param {any[]} data - Mảng dữ liệu
 * @param {number} total - Tổng số bản ghi
 * @param {number} skip - Số bản ghi bỏ qua
 * @param {number} limit - Số bản ghi mỗi trang
 */
const formatPaginatedResponse = (data, total, skip, limit) => {
  return {
    success: true,
    data,
    pagination: {
      total,
      skip,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Format error response
 * @param {Error} error - Lỗi từ try-catch
 * @param {number} statusCode - Mã HTTP status
 */
const formatErrorResponse = (error, statusCode = 500) => {
  console.error('API Error:', error);
  return {
    statusCode,
    body: {
      success: false,
      message: error.message || 'Có lỗi xảy ra'
    }
  };
};

/**
 * Tạo Activity Log khi có hành động (Create/Update/Delete)
 * @param {string} userId - ID người dùng
 * @param {string} action - Hành động (VD: "tạo", "cập nhật", "xóa")
 * @param {string} targetType - Loại target (Project, Task, etc.)
 * @param {string} targetId - ID của target
 * @param {object} details - Chi tiết bổ sung
 */
const createActivityLog = async (ActivityLog, userId, action, targetType, targetId, details = {}) => {
  try {
    const log = new ActivityLog({
      user_id: userId,
      action,
      target_type: targetType,
      target_id: targetId,
      details
    });
    await log.save();
    return log;
  } catch (error) {
    console.error('Error creating activity log:', error);
  }
};

/**
 * Gửi Notification cho User
 * @param {Model} Notification - Mongoose model
 * @param {string} recipientId - ID người nhận
 * @param {string} type - Loại notification
 * @param {string} title - Tiêu đề
 * @param {string} body - Nội dung
 * @param {string} linkTo - Đường dẫn
 * @param {string} senderId - ID người gửi (optional)
 */
const sendNotification = async (Notification, recipientId, type, title, body, linkTo, senderId = null) => {
  try {
    const notification = new Notification({
      recipient_id: recipientId,
      sender_id: senderId,
      type,
      title,
      body,
      link_to: linkTo,
      is_read: false
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID cần kiểm tra
 * @returns {boolean}
 */
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

module.exports = {
  formatResponse,
  formatPaginatedResponse,
  formatErrorResponse,
  createActivityLog,
  sendNotification,
  isValidObjectId
};
