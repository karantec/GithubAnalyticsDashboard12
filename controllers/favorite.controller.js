const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const Favorite = require("../models/Favorite");

// GET /api/favorites
exports.getFavorites = asyncHandler(async (req, res) => {
  const favorites = await Favorite.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json({ success: true, count: favorites.length, data: favorites });
});

// POST /api/favorites
exports.addFavorite = asyncHandler(async (req, res) => {
  const { repoId, name, fullName, owner, description, stars, forks, language, htmlUrl } = req.body;

  if (!repoId || !name || !fullName || !owner || !htmlUrl) {
    throw new AppError("repoId, name, fullName, owner and htmlUrl are required", 400);
  }

  // Friendly pre-check; the unique index still protects against race conditions
  const exists = await Favorite.findOne({ userId: req.userId, repoId });
  if (exists) throw new AppError("Repository is already saved", 409);

  const favorite = await Favorite.create({
    userId: req.userId,
    repoId, name, fullName, owner, description, stars, forks, language, htmlUrl,
  });

  res.status(201).json({ success: true, message: "Repository saved", data: favorite });
});

// DELETE /api/favorites/:repoId
exports.removeFavorite = asyncHandler(async (req, res) => {
  const repoId = Number(req.params.repoId);
  if (!Number.isInteger(repoId)) throw new AppError("Invalid repoId", 400);

  const removed = await Favorite.findOneAndDelete({ userId: req.userId, repoId });
  if (!removed) throw new AppError("Saved repository not found", 404);

  res.json({ success: true, message: "Repository removed" });
});
