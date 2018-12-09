
var express = require("express");
var router = express.Router();

router.get("/test", function(req, res, next) {
    res.render("test.html", {message: "It works!"});
});

module.exports = router;


