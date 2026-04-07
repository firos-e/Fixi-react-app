const mongoose = require("mongoose");
const { requireEnv } = require("../utils/env");

let cachedConnection = global.mongooseConnection;

const connectDB = async () => {
  const mongoUri = requireEnv("MONGO_URI");

  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    cachedConnection = await mongoose.connect(mongoUri);
    global.mongooseConnection = cachedConnection;
    console.log("MongoDB Connected");
    return cachedConnection;
  } catch (err) {
    console.error(err);
    cachedConnection = null;
    throw err;
  }
};

module.exports = connectDB;
