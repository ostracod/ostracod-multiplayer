
var express = require("express");
var router = express.Router();

var pageUtils = require("./pageUtils").pageUtils;

router.get("/test", function(req, res, next) {
    pageUtils.renderPage(res, "./views/test.html", {message: "It works!"});
});

module.exports = router;


