const Booking = require("../Models/Booking");
const User = require("../Models/User");
const Technician = require("../Models/Technician");

const toRadians = (value) => (value * Math.PI) / 180;

const calculateDistanceKm = (from, to) => {
  if (
    !Array.isArray(from) ||
    !Array.isArray(to) ||
    from.length !== 2 ||
    to.length !== 2
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const [fromLng, fromLat] = from.map(Number);
  const [toLng, toLat] = to.map(Number);
  const earthRadiusKm = 6371;
  const latDiff = toRadians(toLat - fromLat);
  const lngDiff = toRadians(toLng - fromLng);
  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(lngDiff / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

exports.createBooking = async (req, res) => {
  try {
    const { service, description, date, time, technicianId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const technician = await Technician.findById(technicianId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!technician) {
      return res.status(404).json({ message: "Selected technician not found" });
    }

    const booking = new Booking({
      user: userId,
      technician: technicianId,
      service,
      description,
      date,
      time,
      location: {
        address: user.location?.address || "",
        coordinates: user.location?.coordinates || [0, 0]
      }
    });

    await booking.save();
    res.json({ message: "Booking created successfully", booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getNearbyTechnicians = async (req, res) => {
  try {
    const { service, longitude, latitude } = req.query;
    const normalizedService = typeof service === "string" ? service.trim() : "";
    const userCoordinates = [parseFloat(longitude), parseFloat(latitude)];

    const technicians = await Technician.find({
      ...(normalizedService ? { services: normalizedService } : {}),
    }).select("-password");

    const sortedTechnicians = technicians
      .map((technician) => {
        const distanceKm = calculateDistanceKm(
          userCoordinates,
          technician.location?.coordinates
        );

        return {
          ...technician.toObject(),
          distanceKm: Number.isFinite(distanceKm)
            ? Number(distanceKm.toFixed(1))
            : null
        };
      })
      .sort((first, second) => {
        const firstDistance = first.distanceKm ?? Number.POSITIVE_INFINITY;
        const secondDistance = second.distanceKm ?? Number.POSITIVE_INFINITY;
        return firstDistance - secondDistance;
      });

    res.json({ technicians: sortedTechnicians });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate("technician", "name phone secondaryPhone location services")
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTechBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ technician: req.user.id })
      .populate("user", "name phone secondaryPhone location")
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const role = req.user.role;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (role === "technician") {
      if (String(booking.technician) !== req.user.id) {
        return res.status(403).json({ message: "You can only update your own bookings" });
      }

      const allowedTransitions = {
        pending: ["accepted", "cancelled"],
        accepted: ["completed", "cancelled"],
        completed: [],
        cancelled: []
      };

      const nextStatuses = allowedTransitions[booking.status] || [];

      if (!nextStatuses.includes(status)) {
        return res.status(400).json({ message: `Cannot change booking from ${booking.status} to ${status}` });
      }
    } else {
      if (String(booking.user) !== req.user.id) {
        return res.status(403).json({ message: "You can only manage your own bookings" });
      }

      if (status !== "cancelled") {
        return res.status(400).json({ message: "Users can only cancel bookings" });
      }

      if (!["pending", "accepted"].includes(booking.status)) {
        return res.status(400).json({ message: `Cannot cancel a ${booking.status} booking` });
      }
    }

    booking.status = status;
    await booking.save();

    const updatedBooking = await Booking.findById(bookingId)
      .populate("user", "name phone secondaryPhone location")
      .populate("technician", "name phone secondaryPhone location services");

    res.json({
      message: "Booking status updated successfully",
      booking: updatedBooking
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
