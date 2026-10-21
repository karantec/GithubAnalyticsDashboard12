const NodeCache = require("node-cache");

const ttl = parseInt(process.env.CACHE_TTL_SECONDS, 10) || 300;

// Search results are cached for 5 minutes by default
const cache = new NodeCache({ stdTTL: ttl, checkperiod: 60, useClones: false });

module.exports = cache;
