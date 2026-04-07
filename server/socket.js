const jwt = require("jsonwebtoken");
const Booking = require("./Models/Booking");

const JWT_SECRET = process.env.JWT_SECRET || "SECRET_KEY";

let ioInstance = null;

const getPersonalRoom = (role, userId) => `personal:${role}:${userId}`;
const getBookingRoom = (bookingId) => `booking:${bookingId}`;

const verifySocketAccessToBooking = async (bookingId, currentUser) => {
  const booking = await Booking.findById(bookingId).select("user technician");

  if (!booking) {
    return false;
  }

  return (
    String(booking.user) === currentUser.id ||
    String(booking.technician) === currentUser.id
  );
};

const initializeSocket = (server) => {
  const { Server } = require("socket.io");

  ioInstance = new Server(server, {
    cors: {
      origin: "*"
    }
  });

  ioInstance.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      return next();
    } catch (err) {
      return next(new Error("Unauthorized"));
    }
  });

  ioInstance.on("connection", (socket) => {
    socket.join(getPersonalRoom(socket.user.role, socket.user.id));

    socket.on("chat:join-booking", async (bookingId) => {
      if (!bookingId) {
        return;
      }

      const canJoin = await verifySocketAccessToBooking(bookingId, socket.user);

      if (canJoin) {
        socket.join(getBookingRoom(bookingId));
      }
    });

    socket.on("chat:leave-booking", (bookingId) => {
      if (bookingId) {
        socket.leave(getBookingRoom(bookingId));
      }
    });
  });

  return ioInstance;
};

const getIo = () => ioInstance;

module.exports = {
  initializeSocket,
  getIo,
  getPersonalRoom,
  getBookingRoom
};
