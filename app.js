require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const repoRoutes = require("./routes/repo.routes");
const favoriteRoutes = require("./routes/favorite.routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// ---------- Core middleware ----------
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json({ limit: "100kb" }));
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

// Protect our own backend (and our GitHub quota) from abuse
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please slow down" },
  })
);

// ---------- Routes ----------
app.get("/health", (req, res) => res.json({ success: true, status: "ok" }));
app.use("/api/repos", repoRoutes);
app.use("/api/favorites", favoriteRoutes);

// ---------- Errors ----------
app.use(notFound);
app.use(errorHandler);

// ---------- Boot ----------
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
});

// Never crash on stray promise rejections
process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));

module.exports = app;
