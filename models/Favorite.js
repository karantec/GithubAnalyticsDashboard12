const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema(
  {
    // No auth required by the brief; clients can send an `x-user-id` header
    // (e.g. a UUID kept in localStorage). Defaults to "default".
    userId: { type: String, required: true, default: "default", index: true },
    repoId: { type: Number, required: true }, // GitHub's numeric repo id
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    owner: { type: String, required: true },
    description: { type: String, default: null },
    stars: { type: Number, default: 0 },
    forks: { type: Number, default: 0 },
    language: { type: String, default: null },
    htmlUrl: { type: String, required: true },
  },
  { timestamps: true }
);

// DB-level guarantee against duplicates (also protects against race conditions)
favoriteSchema.index({ userId: 1, repoId: 1 }, { unique: true });

module.exports = mongoose.model("Favorite", favoriteSchema);
