
const fs = require("fs");
const pathUtils = require("path");
const Mustache = require("mustache");

class PageUtils {
    
    constructor() {
        this.errorOutput = {
            JSON_ERROR_OUTPUT: 0,
            PAGE_ERROR_OUTPUT: 1,
            SOCKET_ERROR_OUTPUT: 2,
        };
    }
    
    renderPage(res, path, options, parameters) {
        const getOption = (name, defaultValue) => {
            if (typeof options[name] === "undefined") {
                return defaultValue;
            }
            return options[name];
        };
        const tempScriptList = getOption("scripts", []);
        let tempStylesheetList = getOption("stylesheets", []);
        const tempShouldDisplayTitle = getOption("shouldDisplayTitle", true);
        const tempContentWidth = getOption("contentWidth", 680);
        if ("stylesheets" in ostracodMultiplayer.serverConfig) {
            const tempDefaultStylesheetList = ostracodMultiplayer.serverConfig.stylesheets;
            tempStylesheetList = tempStylesheetList.slice();
            for (const stylesheet of tempDefaultStylesheetList) {
                tempStylesheetList.unshift(stylesheet);
            }
        }
        const tempTemplate = fs.readFileSync(path, "utf8");
        const tempContent = Mustache.render(tempTemplate, parameters);
        res.render("template.html", {
            gameName: ostracodMultiplayer.serverConfig.gameName.toUpperCase(),
            scripts: tempScriptList,
            stylesheets: tempStylesheetList,
            shouldDisplayTitle: tempShouldDisplayTitle,
            content: tempContent,
            contentWidth: tempContentWidth,
        });
    }
    
    getLocalViewPath(fileName) {
        return pathUtils.join(ostracodMultiplayer.localViewsDirectory, fileName);
    }
    
    getConsumerViewPath(fileName) {
        return pathUtils.join(ostracodMultiplayer.consumerViewsDirectory, fileName);
    }
    
    serveMessagePage(res, message, url, urlLabel) {
        pageUtils.renderPage(
            res,
            pageUtils.getLocalViewPath("message.html"),
            {},
            { message, url, urlLabel },
        );
    }
    
    generateReturnUrl(req) {
        if (pageUtils.isAuthenticated(req)) {
            return {
                url: "/menu",
                urlLabel: "Return to Main Menu",
            };
        } else {
            return {
                url: "/login",
                urlLabel: "Return to Login Page",
            };
        }
    }
    
    reportDatabaseErrorWithJson(error, req, res) {
        res.json({
            success: false,
            message: "An error occurred. Please contact an administrator.",
        });
        console.log(error);
    }
    
    reportDatabaseErrorWithPage(error, req, res) {
        const tempUrl = pageUtils.generateReturnUrl(req);
        pageUtils.serveMessagePage(
            res,
            "An error occurred. Please contact an administrator.",
            tempUrl.url,
            tempUrl.urlLabel,
        );
        console.log(error);
    }
    
    reportDatabaseError(error, errorOutput, req, res) {
        console.log(error);
        if (errorOutput === pageUtils.errorOutput.JSON_ERROR_OUTPUT) {
            pageUtils.reportDatabaseErrorWithJson(error, req, res);
        }
        if (errorOutput === pageUtils.errorOutput.PAGE_ERROR_OUTPUT) {
            pageUtils.reportDatabaseErrorWithPage(error, req, res);
        }
    }
    
    getUsername(req) {
        return req.session.username;
    }
    
    isAuthenticated(req) {
        if (ostracodMultiplayer.mode === "development") {
            if (!req.session.username) {
                const tempUsername = req.query.username;
                if (tempUsername) {
                    req.session.username = tempUsername;
                }
            }
        }
        return (typeof req.session.username !== "undefined");
    }
    
    checkAuthentication(errorOutput) {
        if (errorOutput === pageUtils.errorOutput.SOCKET_ERROR_OUTPUT) {
            return (ws, req, next) => {
                if (pageUtils.isAuthenticated(req)) {
                    next();
                } else {
                    ws.on("message", () => {
                        ws.send(JSON.stringify({
                            success: false,
                            message: "You are not currently logged in.",
                        }));
                    });
                }
            };
        } else {
            return (req, res, next) => {
                if (pageUtils.isAuthenticated(req)) {
                    next();
                } else {
                    if (errorOutput === pageUtils.errorOutput.JSON_ERROR_OUTPUT) {
                        res.json({
                            success: false,
                            message: "You are not currently logged in.",
                        });
                    }
                    if (errorOutput === pageUtils.errorOutput.PAGE_ERROR_OUTPUT) {
                        pageUtils.serveMessagePage(
                            res,
                            "You must be logged in to view that page.",
                            "login",
                            "Log In",
                        );
                    }
                }
            };
        }
    }
}

const pageUtils = new PageUtils();

module.exports = { pageUtils };

const { ostracodMultiplayer } = require("./ostracodMultiplayer");


