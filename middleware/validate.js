const AppError = require("../utils/AppError");

const SORT_MAP = { stars: "stars", updated: "updated" };

/** Validates & normalises ?q, page, per_page, sort, order for search */
exports.validateSearch = (req, res, next) => {
  const q = (req.query.q || "").trim();
  if (!q) return next(new AppError("Search keyword 'q' is required", 400));
  if (q.length > 256) return next(new AppError("Search keyword is too long", 400));

  const page = parseInt(req.query.page, 10) || 1;
  const perPage = parseInt(req.query.per_page, 10) || 10;
  if (page < 1) return next(new AppError("'page' must be >= 1", 400));
  if (perPage < 1 || perPage > 100)
    return next(new AppError("'per_page' must be between 1 and 100", 400));

  // GitHub Search API only returns the first 1000 results
  if (page * perPage > 1000)
    return next(new AppError("GitHub only exposes the first 1000 search results", 400));

  const sortRaw = (req.query.sort || "").toLowerCase();
  if (sortRaw && !SORT_MAP[sortRaw])
    return next(new AppError("'sort' must be 'stars' or 'updated'", 400));

  const order = (req.query.order || "desc").toLowerCase();
  if (!["asc", "desc"].includes(order))
    return next(new AppError("'order' must be 'asc' or 'desc'", 400));

  req.search = { q, page, perPage, sort: SORT_MAP[sortRaw], order };
  next();
};

/** Validates :owner/:repo path params */
exports.validateRepoParams = (req, res, next) => {
  const re = /^[A-Za-z0-9_.-]+$/;
  const { owner, repo } = req.params;
  if (!re.test(owner) || !re.test(repo))
    return next(new AppError("Invalid repository owner or name", 400));
  next();
};

/** Attaches req.userId from x-user-id header */
exports.attachUser = (req, res, next) => {
  const id = (req.headers["x-user-id"] || "default").toString().trim();
  req.userId = id.slice(0, 100) || "default";
  next();
};
