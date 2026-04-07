const Booking = require("../Models/Booking");
const Message = require("../Models/Message");
const {
  getIo,
  getPersonalRoom,
  getBookingRoom
} = require("../socket");

const loadAccessibleBooking = async (bookingId, currentUser) => {
  const booking = await Booking.findById(bookingId)
    .populate("user", "name")
    .populate("technician", "name");

  if (!booking) {
    return { error: { status: 404, message: "Booking not found" } };
  }

  const isBookingUser = String(booking.user?._id || booking.user) === currentUser.id;
  const isBookingTechnician = String(booking.technician?._id || booking.technician) === currentUser.id;

  if (!isBookingUser && !isBookingTechnician) {
    return { error: { status: 403, message: "You are not allowed to access this chat" } };
  }

  return { booking };
};

const buildUnreadSummary = async (currentUser) => {
  const bookingQuery =
    currentUser.role === "technician"
      ? { technician: currentUser.id }
      : { user: currentUser.id };

  const bookings = await Booking.find(bookingQuery)
    .populate("user", "name")
    .populate("technician", "name")
    .select("_id service status user technician")
    .sort({ updatedAt: -1 });

  if (bookings.length === 0) {
    return {
      totalUnreadMessages: 0,
      totalUnreadBookings: 0,
      bookings: []
    };
  }

  const unreadCounts = await Message.aggregate([
    {
      $match: {
        booking: { $in: bookings.map((booking) => booking._id) },
        senderRole: { $ne: currentUser.role },
        readByRoles: { $nin: [currentUser.role] }
      }
    },
    {
      $group: {
        _id: "$booking",
        unreadCount: { $sum: 1 }
      }
    }
  ]);

  const unreadMap = unreadCounts.reduce((accumulator, item) => {
    accumulator[String(item._id)] = item.unreadCount;
    return accumulator;
  }, {});

  const summaryBookings = bookings
    .map((booking) => {
      const unreadCount = unreadMap[String(booking._id)] || 0;
      const otherParty =
        currentUser.role === "technician" ? booking.user : booking.technician;

      return {
        bookingId: booking._id,
        service: booking.service,
        status: booking.status,
        unreadCount,
        otherPartyName: otherParty?.name || "Unknown"
      };
    })
    .filter((booking) => booking.unreadCount > 0);

  return {
    totalUnreadMessages: summaryBookings.reduce(
      (total, booking) => total + booking.unreadCount,
      0
    ),
    totalUnreadBookings: summaryBookings.length,
    bookings: summaryBookings
  };
};

exports.getBookingMessages = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await loadAccessibleBooking(bookingId, req.user);

    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    const messages = await Message.find({ booking: bookingId }).sort({ createdAt: 1 });

    res.json({
      booking: {
        _id: result.booking._id,
        service: result.booking.service,
        status: result.booking.status,
        user: result.booking.user,
        technician: result.booking.technician
      },
      messages
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch messages" });
  }
};

exports.getUnreadSummary = async (req, res) => {
  try {
    const summary = await buildUnreadSummary(req.user);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch unread summary" });
  }
};

exports.markBookingMessagesRead = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await loadAccessibleBooking(bookingId, req.user);

    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    await Message.updateMany(
      {
        booking: bookingId,
        senderRole: { $ne: req.user.role },
        readByRoles: { $nin: [req.user.role] }
      },
      {
        $addToSet: { readByRoles: req.user.role }
      }
    );

    const io = getIo();
    const summary = await buildUnreadSummary(req.user);

    if (io) {
      io.to(getPersonalRoom(req.user.role, req.user.id)).emit("chat:summary", summary);
    }

    res.json({
      message: "Messages marked as read",
      summary
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to mark messages as read" });
  }
};

exports.sendBookingMessage = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";

    if (!text) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const result = await loadAccessibleBooking(bookingId, req.user);

    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    const recipient =
      req.user.role === "technician"
        ? result.booking.user
        : result.booking.technician;

    const message = await Message.create({
      booking: bookingId,
      senderId: req.user.id,
      senderRole: req.user.role,
      readByRoles: [req.user.role],
      text
    });

    const io = getIo();
    const recipientSummary = recipient
      ? await buildUnreadSummary({
          id: String(recipient._id),
          role: req.user.role === "technician" ? "user" : "technician"
        })
      : null;

    if (io) {
      io.to(getBookingRoom(bookingId)).emit("chat:message", {
        bookingId,
        chatMessage: message
      });

      if (recipient && recipientSummary) {
        io.to(
          getPersonalRoom(
            req.user.role === "technician" ? "user" : "technician",
            String(recipient._id)
          )
        ).emit("chat:summary", recipientSummary);
      }
    }

    res.status(201).json({
      message: "Message sent successfully",
      chatMessage: message
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to send message" });
  }
};
