const asyncHandler = require("../utils/asyncHandler");
const github = require("../services/github.service");

// GET /api/repos/search?q=react&page=1&per_page=10&sort=stars|updated&order=desc
exports.searchRepos = asyncHandler(async (req, res) => {
  const { q, page, perPage, sort, order } = req.search;
  const result = await github.searchRepositories({ q, page, perPage, sort, order });

  const totalPages = Math.min(Math.ceil(result.totalCount / perPage), Math.ceil(1000 / perPage));

  res.json({
    success: true,
    message: result.items.length ? "Repositories fetched" : "No repositories found",
    cached: result.cached,
    pagination: {
      page,
      perPage,
      totalCount: result.totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    data: result.items, // [] when empty
  });
});

// GET /api/repos/:owner/:repo
exports.getRepoDetails = asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;
  const data = await github.getRepositoryDetails(owner, repo);
  res.json({ success: true, data });
});
