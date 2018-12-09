
var fs = require("fs");
var pathUtils = require("path");
var Mustache = require("mustache");

function PageUtils() {
    
}

var pageUtils = new PageUtils();

module.exports = {
    pageUtils: pageUtils
};

var ostracodMultiplayer = require("./ostracodMultiplayer").ostracodMultiplayer;

PageUtils.prototype.renderPage = function(res, path, scriptList, parameters) {
    var tempTemplate = fs.readFileSync(path, "utf8");
    var tempContent = Mustache.render(tempTemplate, parameters);
    res.render("template.html", {
        gameName: ostracodMultiplayer.serverConfig.gameName.toUpperCase(),
        scripts: scriptList,
        content: tempContent
    });
}

PageUtils.prototype.getLocalViewPath = function(fileName) {
    return pathUtils.join(__dirname, "views", fileName);
}

PageUtils.prototype.serveMessagePage = function(res, message, url, urlLabel) {
    pageUtils.renderPage(
        res,
        pageUtils.getLocalViewPath("message.html"),
        [],
        {
            message: message,
            url: url,
            urlLabel: urlLabel
        }
    );
}

PageUtils.prototype.generateReturnUrl = function(req) {
    if (req.session.username) {
        return {
            url: "/menu",
            urlLabel: "Return to Main Menu"
        };
    } else {
        return {
            url: "/login",
            urlLabel: "Return to Login Page"
        };
    }
}

PageUtils.prototype.reportDatabaseErrorWithJson = function(error, req, res) {
    res.json({success: false, message: "An error occurred. Please contact an administrator."});
    console.log(error);
}

PageUtils.prototype.reportDatabaseErrorWithPage = function(error, req, res) {
    var tempUrl = pageUtils.generateReturnUrl(req);
    pageUtils.serveMessagePage(res, "An error occurred. Please contact an administrator.", tempUrl.url, tempUrl.urlLabel);
    console.log(error);
}


