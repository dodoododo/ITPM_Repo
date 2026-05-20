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
    socket.join(String(socket.user.userId));
  });

  return ioInstance;
};

const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(String(userId)).emit(event, payload);
};

module.exports = {
  initSocket,
  emitToUser,
};
