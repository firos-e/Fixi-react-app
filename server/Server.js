require("dotenv").config(); // ✅ always at top

const express = require("express");
const cors = require("cors");
const http = require("http");
const connectDB = require("./Config/Db");
const { initializeSocket } = require("./socket");

const app = express();
const server = http.createServer(app);

// middleware
app.use(cors());
app.use(express.json());

// connect DB
connectDB();

// routes
app.use("/api/auth", require("./Routes/auth"));
app.use("/api/district", require("./Routes/district"));
app.use("/api/booking", require("./Routes/bookingRoutes"));
app.use("/api/chat", require("./Routes/chatRoutes"));

// server start
initializeSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
