
var fs = require("fs");
var pathUtils = require("path");
var Mustache = require("mustache");

var ostracodMultiplayer = require("./ostracodMultiplayer").ostracodMultiplayer;

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

PageUtils.prototype.reportDatabaseError = function(error, errorOutput, req, res) {
    console.log(error);
    if (errorOutput == pageUtils.errorOutput.JSON_ERROR_OUTPUT) {
        pageUtils.reportDatabaseErrorWithJson(error, req, res);
    }
    if (errorOutput == pageUtils.errorOutput.PAGE_ERROR_OUTPUT) {
        pageUtils.reportDatabaseErrorWithPage(error, req, res);
    }
}

PageUtils.prototype.isAuthenticated = function(req) {
    if (ostracodMultiplayer.mode == "development") {
        if (!req.session.username) {
            var tempUsername = req.query.username;
            if (tempUsername) {
                req.session.username = tempUsername;
            }
        }
    }
    return (typeof req.session.username !== "undefined");
}

PageUtils.prototype.checkAuthentication = function(errorOutput) {
    if (errorOutput == pageUtils.errorOutput.SOCKET_ERROR_OUTPUT) {
        return function(ws, req, next) {
            if (pageUtils.isAuthenticated(req)) {
                next();
            } else {
                ws.on("message", function(message) {
                    ws.send(JSON.stringify({
                        success: false,
                        message: "You are not currently logged in."
                    }));
                });
            }
        };
    } else {
        return function(req, res, next) {
            if (pageUtils.isAuthenticated(req)) {
                next();
            } else {
                if (errorOutput == pageUtils.errorOutput.JSON_ERROR_OUTPUT) {
                    res.json({success: false, message: "You are not currently logged in."});
                }
                if (errorOutput == pageUtils.errorOutput.PAGE_ERROR_OUTPUT) {
                    pageUtils.serveMessagePage(res, "You must be logged in to view that page.", "login", "Log In");
                }
            }
        };
    }
}

PageUtils.prototype.errorOutput = {
    JSON_ERROR_OUTPUT: 0,
    PAGE_ERROR_OUTPUT: 1,
    SOCKET_ERROR_OUTPUT: 2
}


