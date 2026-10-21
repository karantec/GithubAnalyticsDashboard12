const router = require("express").Router();
const { searchRepos, getRepoDetails } = require("../controllers/repo.controller");
const { validateSearch, validateRepoParams } = require("../middleware/validate");

router.get("/search", validateSearch, searchRepos);
router.get("/:owner/:repo", validateRepoParams, getRepoDetails);

module.exports = router;
