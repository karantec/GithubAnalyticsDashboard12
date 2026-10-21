const router = require("express").Router();
const { getFavorites, addFavorite, removeFavorite } = require("../controllers/favorite.controller");
const { attachUser } = require("../middleware/validate");

router.use(attachUser);

router.route("/").get(getFavorites).post(addFavorite);
router.delete("/:repoId", removeFavorite);

module.exports = router;
