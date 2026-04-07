const jwt = require("jsonwebtoken");
const { requireEnv } = require("../utils/env");

const getJwtSecret = () => {
  return requireEnv("JWT_SECRET");
};

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token, unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};
