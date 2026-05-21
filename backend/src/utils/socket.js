const { Server } = require("socket.io");
const { verifyJWT } = require("./authHelpers");

let ioInstance = null;

const initSocket = (server, corsOrigin) => {
  ioInstance = new Server(server, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  ioInstance.use((socket, next) => {
    const token = socket.handshake.auth?.token
      || socket.handshake.headers?.authorization?.replace("Bearer ", "");

    const decoded = token ? verifyJWT(token) : null;
    if (!decoded?.userId) {
      return next(new Error("Unauthorized"));
    }

    socket.user = decoded;
    return next();
  });

  ioInstance.on("connection", (socket) => {
    // User joins their personal room for notifications
    socket.join(String(socket.user.userId));

    // Handle task room join
    socket.on("join_task", (taskId) => {
      const taskRoom = `task_${taskId}`;
      socket.join(taskRoom);
    });

    // Handle task room leave
    socket.on("leave_task", (taskId) => {
      const taskRoom = `task_${taskId}`;
      socket.leave(taskRoom);
    });

    // Handle typing indicator
    socket.on("typing", (data) => {
      const { taskId, isTyping } = data;
      const taskRoom = `task_${taskId}`;
      socket.broadcast.to(taskRoom).emit("user_typing", {
        userId: socket.user.userId,
        userName: socket.user.userName || "Unknown",
        taskId,
        isTyping,
      });
    });

    // Handle stop typing
    socket.on("stop_typing", (taskId) => {
      const taskRoom = `task_${taskId}`;
      socket.broadcast.to(taskRoom).emit("user_typing", {
        userId: socket.user.userId,
        userName: socket.user.userName || "Unknown",
        taskId,
        isTyping: false,
      });
    });

    socket.on("disconnect", () => {
      // Cleanup if needed
    });
  });

  return ioInstance;
};

const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(String(userId)).emit(event, payload);
};

/**
 * Broadcast a new comment to all users in a task room
 */
const broadcastNewComment = (taskId, comment) => {
  if (!ioInstance || !taskId) return;
  const taskRoom = `task_${taskId}`;
  ioInstance.to(taskRoom).emit("new_comment", comment);
};

/**
 * Emit mention notification to specific users (real-time bell)
 */
const emitMentionNotification = (userIds, notification) => {
  if (!ioInstance || !userIds || userIds.length === 0) return;
  userIds.forEach((userId) => {
    emitToUser(userId, "new_notification", notification);
  });
};

/**
 * Broadcast comment notification to task room (bell + sound)
 */
const broadcastCommentNotification = (taskId, notification) => {
  if (!ioInstance || !taskId) return;
  const taskRoom = `task_${taskId}`;
  ioInstance.to(taskRoom).emit("task_comment_notification", notification);
};

module.exports = {
  initSocket,
  emitToUser,
  broadcastNewComment,
  emitMentionNotification,
  broadcastCommentNotification,
};
