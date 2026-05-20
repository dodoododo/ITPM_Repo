require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const connectDB = require("./config/db");
const apiRoutes = require("./routes");
const { initSocket } = require("./utils/socket");

const app = express();
const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];
const corsOrigin = [...new Set([
  ...configuredOrigins,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
])];

// middleware
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

// Connect to DATABASE
connectDB();

app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "ITPM API is running",
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initSocket(server, corsOrigin);

server.listen(PORT, () => console.log("Server running on port " + PORT));
