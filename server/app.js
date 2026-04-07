require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./Config/Db");
const { readEnv } = require("./utils/env");

const app = express();

const allowedOrigins = readEnv("CLIENT_ORIGIN")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors(
    allowedOrigins.length > 0
      ? {
          origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
              return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
          }
        }
      : {}
  )
);
app.use(express.json());

app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", require("./Routes/auth"));
app.use("/api/district", require("./Routes/district"));
app.use("/api/booking", require("./Routes/bookingRoutes"));
app.use("/api/chat", require("./Routes/chatRoutes"));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = app;
