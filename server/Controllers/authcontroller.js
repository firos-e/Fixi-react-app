const User = require("../Models/User");
const Technician = require("../Models/Technician");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { requireEnv } = require("../utils/env");

const getJwtSecret = () => {
  return requireEnv("JWT_SECRET");
};

const buildTechnicianPayload = (source) => ({
  name: source.name,
  email: source.email,
  password: source.password,
  role: "technician",
  phone: source.phone || "",
  secondaryPhone: source.secondaryPhone || "",
  services: Array.isArray(source.services) ? source.services : [],
  location: {
    type: "Point",
    coordinates: Array.isArray(source.location?.coordinates) ? source.location.coordinates : [0, 0],
    address: source.location?.address || ""
  },
  profilePicture: source.profilePicture || "",
  isVerified: Boolean(source.isVerified)
});

const ensureTechnicianRecord = async (legacyUser) => {
  if (!legacyUser || legacyUser.role !== "technician") {
    return null;
  }

  let technician = await Technician.findOne({ email: legacyUser.email });

  if (!technician) {
    technician = await Technician.create(buildTechnicianPayload(legacyUser));
  }

  return technician;
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password, role, phone, secondaryPhone, location, services } = req.body;

    const [existingUser, existingTechnician] = await Promise.all([
      User.findOne({ email }),
      Technician.findOne({ email })
    ]);

    if (existingUser || existingTechnician) {
      return res.json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const basePayload = {
      name,
      email,
      password: hashedPassword,
      phone,
      secondaryPhone: secondaryPhone || "",
      location: {
        type: "Point",
        coordinates: location?.coordinates || [0, 0],
        address: location?.address || ""
      }
    };

    if (role === "technician") {
      await Technician.create({
        ...basePayload,
        services: Array.isArray(services) ? services.filter(Boolean) : []
      });
    } else {
      await User.create({
        ...basePayload,
        role: role || "user"
      });
    }

    res.json({ message: "Signup successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [appUser, technicianRecord] = await Promise.all([
      User.findOne({ email }),
      Technician.findOne({ email })
    ]);

    let user = technicianRecord || appUser;

    if (!technicianRecord && appUser?.role === "technician") {
      user = await ensureTechnicianRecord(appUser);
    }

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, getJwtSecret(), { expiresIn: "1d" });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        secondaryPhone: user.secondaryPhone || "",
        location: user.location,
        services: user.services || []
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    let user;

    if (req.user.role === "technician") {
      user = await Technician.findById(req.user.id).select("-password");

      if (!user) {
        const legacyUser = await User.findById(req.user.id).select("-password");
        user = legacyUser ? await ensureTechnicianRecord(legacyUser) : null;
      }
    } else {
      user = await User.findById(req.user.id).select("-password");
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, secondaryPhone, location, services } = req.body;
    let Model = req.user.role === "technician" ? Technician : User;
    let existingUser = await Model.findById(req.user.id)
      .select("name phone secondaryPhone location services role email password profilePicture isVerified");

    if (!existingUser && req.user.role === "technician") {
      const legacyUser = await User.findById(req.user.id)
        .select("name phone secondaryPhone location services role email password profilePicture isVerified");
      existingUser = legacyUser ? await ensureTechnicianRecord(legacyUser) : null;
      Model = Technician;
    }

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const updates = {};

    if (typeof name === "string" && name.trim()) {
      updates.name = name.trim();
    }

    if (typeof phone === "string") {
      updates.phone = phone.trim();
    }

    if (typeof secondaryPhone === "string") {
      updates.secondaryPhone = secondaryPhone.trim();
    }

    if (Array.isArray(services) && req.user.role === "technician") {
      updates.services = services
        .map((service) => String(service).trim())
        .filter(Boolean);
    }

    const nextLocation = {
      type: "Point",
      address: existingUser.location?.address || "",
      coordinates: Array.isArray(existingUser.location?.coordinates) &&
        existingUser.location.coordinates.length === 2
        ? existingUser.location.coordinates
        : [0, 0]
    };

    if (location && typeof location.address === "string") {
      nextLocation.address = location.address.trim();
    }

    if (
      location &&
      Array.isArray(location.coordinates) &&
      location.coordinates.length === 2 &&
      location.coordinates.every((value) => Number.isFinite(Number(value)))
    ) {
      nextLocation.coordinates = location.coordinates.map(Number);
    }

    updates.location = nextLocation;

    const safeUser = await Model.findByIdAndUpdate(
      existingUser._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({ message: "Profile updated successfully", user: safeUser });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Failed to update profile", error: err.message });
  }
};
