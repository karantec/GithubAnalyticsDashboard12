const axios = require("axios");
const AppError = require("../utils/AppError");
const cache = require("../utils/cache");

const github = axios.create({
  baseURL: process.env.GITHUB_API_URL || "https://api.github.com",
  timeout: 10000,
  headers: {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "github-explorer-app",
    ...(process.env.GITHUB_TOKEN && {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    }),
  },
});

/**
 * Translate any GitHub / network failure into a clean AppError.
 * Covers: rate limits, 404 (invalid/deleted repo), 422 (bad query),
 * 5xx (GitHub down), timeouts / network errors.
 */
const handleGithubError = (err) => {
  if (err instanceof AppError) return err;

  // No response => network error or timeout
  if (!err.response) {
    if (err.code === "ECONNABORTED") {
      return new AppError("GitHub API request timed out", 504);
    }
    return new AppError("GitHub API is unreachable. Please try again later", 503);
  }

  const { status, headers, data } = err.response;
  const remaining = headers["x-ratelimit-remaining"];
  const reset = headers["x-ratelimit-reset"];
  const retryAfterHeader = headers["retry-after"];

  // Rate limit: 403/429 with remaining = 0 (or a retry-after header)
  const isRateLimited =
    status === 429 ||
    (status === 403 &&
      (remaining === "0" || /rate limit/i.test(data?.message || "")));

  if (isRateLimited) {
    const resetAt = reset ? new Date(parseInt(reset, 10) * 1000) : null;
    const retryAfter = retryAfterHeader
      ? parseInt(retryAfterHeader, 10)
      : resetAt
      ? Math.max(0, Math.ceil((resetAt - Date.now()) / 1000))
      : 60;
    return new AppError(
      "GitHub API rate limit exceeded. Please try again later",
      429,
      { retryAfter, resetAt }
    );
  }

  if (status === 404) {
    return new AppError("Repository not found (it may be invalid, private or deleted)", 404);
  }
  if (status === 451) {
    return new AppError("Repository is unavailable for legal reasons", 451);
  }
  if (status === 422) {
    return new AppError(data?.message || "Invalid search query", 400);
  }
  if (status === 401) {
    return new AppError("GitHub token is invalid or expired", 500);
  }
  if (status >= 500) {
    return new AppError("GitHub API is currently unavailable", 502);
  }
  return new AppError(data?.message || "GitHub API request failed", status);
};

const request = async (url, config = {}) => {
  try {
    return await github.get(url, config);
  } catch (err) {
    throw handleGithubError(err);
  }
};

const mapRepo = (r) => ({
  id: r.id,
  name: r.name,
  fullName: r.full_name,
  owner: r.owner?.login,
  ownerAvatar: r.owner?.avatar_url,
  description: r.description,
  stars: r.stargazers_count,
  forks: r.forks_count,
  language: r.language,
  openIssues: r.open_issues_count,
  htmlUrl: r.html_url,
  updatedAt: r.updated_at,
});

/** Search repositories (cached 5 min) */
const searchRepositories = async ({ q, page, perPage, sort, order }) => {
  const cacheKey = `search:${q.toLowerCase()}:${page}:${perPage}:${sort || "best"}:${order}`;
  const cached = cache.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  const params = { q, page, per_page: perPage, order };
  if (sort) params.sort = sort; // "stars" | "updated"; omitted => best match

  const { data } = await request("/search/repositories", { params });

  const result = {
    totalCount: data.total_count,
    incompleteResults: data.incomplete_results,
    items: data.items.map(mapRepo),
  };

  cache.set(cacheKey, result);
  return { ...result, cached: false };
};

/** Repo info + latest 5 commits + top 5 contributors */
const getRepositoryDetails = async (owner, repo) => {
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  // Repo must exist first; this gives a clean 404 for invalid/deleted repos
  const { data: repoData } = await request(base);

  // Commits/contributors can fail independently (e.g. empty repo => 409,
  // huge repo contributors => 403). Don't let that break the whole page.
  const [commitsRes, contributorsRes] = await Promise.allSettled([
    request(`${base}/commits`, { params: { per_page: 5 } }),
    request(`${base}/contributors`, { params: { per_page: 5 } }),
  ]);

  // If the failure was a rate limit, surface it instead of hiding it
  [commitsRes, contributorsRes].forEach((r) => {
    if (r.status === "rejected" && r.reason.statusCode === 429) throw r.reason;
  });

  const commits =
    commitsRes.status === "fulfilled" && Array.isArray(commitsRes.value.data)
      ? commitsRes.value.data.map((c) => ({
          sha: c.sha,
          message: c.commit.message.split("\n")[0],
          author: c.commit.author?.name || c.author?.login || "Unknown",
          authorAvatar: c.author?.avatar_url || null,
          date: c.commit.author?.date,
          htmlUrl: c.html_url,
        }))
      : [];

  const contributors =
    contributorsRes.status === "fulfilled" && Array.isArray(contributorsRes.value.data)
      ? contributorsRes.value.data.map((c) => ({
          login: c.login,
          avatar: c.avatar_url,
          contributions: c.contributions,
          htmlUrl: c.html_url,
        }))
      : [];

  return {
    ...mapRepo(repoData),
    defaultBranch: repoData.default_branch,
    createdAt: repoData.created_at,
    license: repoData.license?.name || null,
    topics: repoData.topics || [],
    watchers: repoData.subscribers_count ?? repoData.watchers_count,
    archived: repoData.archived,
    commits,
    contributors,
    partial: commitsRes.status === "rejected" || contributorsRes.status === "rejected",
  };
};

module.exports = { searchRepositories, getRepositoryDetails };
