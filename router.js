
var pathUtils = require("path");
var express = require("express");
var router = express.Router();

module.exports = router;

var ostracodMultiplayer = require("./ostracodMultiplayer").ostracodMultiplayer;
var pageUtils = require("./pageUtils").pageUtils;
var dbUtils = require("./dbUtils").dbUtils;

function getLocalViewPath(fileName) {
    return pathUtils.join(__dirname, "views", fileName);
}

router.get("/login", function(req, res, next) {
    pageUtils.renderPage(
        res,
        getLocalViewPath("login.html"),
        ["javascript/login.js"],
        {author: ostracodMultiplayer.serverConfig.author}
    );
});


