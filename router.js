
var fs = require("fs");
var pathUtils = require("path");
var express = require("express");
var router = express.Router();

module.exports = router;

var ostracodMultiplayer = require("./ostracodMultiplayer").ostracodMultiplayer;
var pageUtils = require("./pageUtils").pageUtils;
var dbUtils = require("./dbUtils").dbUtils;
var accountUtils = require("./accountUtils").accountUtils;
var gameUtils = require("./gameUtils").gameUtils;

var checkAuthentication = pageUtils.checkAuthentication;
var JSON_ERROR_OUTPUT = pageUtils.errorOutput.JSON_ERROR_OUTPUT;
var PAGE_ERROR_OUTPUT = pageUtils.errorOutput.PAGE_ERROR_OUTPUT;
var SOCKET_ERROR_OUTPUT = pageUtils.errorOutput.SOCKET_ERROR_OUTPUT;

router.get("/", function(req, res, next) {
    if (pageUtils.isAuthenticated(req)) {
        res.redirect("menu");
    } else {
        res.redirect("login");
    }
});

router.get("/login", function(req, res, next) {
    var tempWelcomePath = pageUtils.getConsumerViewPath(
        ostracodMultiplayer.serverConfig.welcomeViewFile
    );
    pageUtils.renderPage(
        res,
        pageUtils.getLocalViewPath("login.html"),
        {scripts: ["javascript/login.js"]},
        {
            author: ostracodMultiplayer.serverConfig.author,
            welcomeContent: fs.readFileSync(tempWelcomePath, "utf8")
        }
    );
});

router.post("/loginAction", function(req, res, next) {
    var tempUsername = req.body.username;
    var tempPassword = req.body.password;
    dbUtils.performTransaction(function(done) {
        accountUtils.getAccountByUsername(tempUsername, function(error, result) {
            if (error) {
                pageUtils.reportDatabaseErrorWithJson(error, req, res);
                done();
                return;
            }
            if (!result) {
                res.json({success: false, message: "Bad account credentials."});
                done();
                return;
            }
            accountUtils.comparePasswordWithHash(tempPassword, result.passwordHash, function(result) {
                if (!result.success) {
                    pageUtils.reportDatabaseErrorWithJson(result.error, req, res);
                    done();
                    return;
                }
                if (!result.isMatch) {
                    res.json({success: false, message: "Bad account credentials."});
                    done();
                    return;
                }
                req.session.username = tempUsername;
                res.json({success: true});
                done();
            });
        });
    }, function() {});
});

router.get("/logoutAction", function(req, res, next) {
    if (req.session.username) {
        delete req.session["username"];
    }
    res.redirect("login");
});

router.get("/createAccount", function(req, res, next) {
    pageUtils.renderPage(
        res,
        pageUtils.getLocalViewPath("createAccount.html"),
        {scripts: ["javascript/createAccount.js"]},
        {}
    );
});

router.post("/createAccountAction", function(req, res, next) {
    var tempUsername = req.body.username;
    var tempPassword = req.body.password;
    var tempEmailAddress = req.body.emailAddress;
    if (tempUsername.length > 30) {
        res.json({success: false, message: "Your username may not be longer than 30 characters."});
        return;
    }
    dbUtils.performTransaction(function(done) {
        accountUtils.getAccountByUsername(tempUsername, function(error, result) {
            if (error) {
                pageUtils.reportDatabaseErrorWithJson(error, req, res);
                done();
                return;
            }
            if (result) {
                res.json({success: false, message: "An account with that name already exists."});
                done();
                return;
            }
            accountUtils.generatePasswordHash(tempPassword, function(result) {
                if (!result.success) {
                    pageUtils.reportDatabaseErrorWithJson(result.error, req, res);
                    done();
                    return;
                }
                var tempPasswordHash = result.hash;
                accountUtils.addAccount({
                    username: tempUsername,
                    passwordHash: tempPasswordHash,
                    emailAddress: tempEmailAddress
                }, function(error) {
                    if (error) {
                        pageUtils.reportDatabaseErrorWithJson(error, req, res);
                        done();
                        return;
                    }
                    res.json({success: true});
                    done();
                });
            });
        });
    }, function() {});
});

router.get("/changePassword", checkAuthentication(PAGE_ERROR_OUTPUT), function(req, res, next) {
    pageUtils.renderPage(
        res,
        pageUtils.getLocalViewPath("changePassword.html"),
        {scripts: ["javascript/changePassword.js"]},
        {}
    );
});

router.post("/changePasswordAction", checkAuthentication(JSON_ERROR_OUTPUT), function(req, res, next) {
    var tempUsername = pageUtils.getUsername(req);
    var tempOldPassword = req.body.oldPassword;
    var tempNewPassword = req.body.newPassword;
    dbUtils.performTransaction(function(done) {
        accountUtils.getAccountByUsername(tempUsername, function(error, result) {
            if (error) {
                pageUtils.reportDatabaseErrorWithJson(error, req, res);
                done();
                return;
            }
            var tempAccount = result;
            accountUtils.comparePasswordWithHash(tempOldPassword, tempAccount.passwordHash, function(result) {
                if (!result.success) {
                    pageUtils.reportDatabaseErrorWithJson(result.error, req, res);
                    done();
                    return;
                }
                if (!result.isMatch) {
                    res.json({success: false, message: "Incorrect old password."});
                    done();
                    return;
                }
                accountUtils.generatePasswordHash(tempNewPassword, function(result) {
                    if (!result.success) {
                        pageUtils.reportDatabaseErrorWithJson(result.error, req, res);
                        done();
                        return;
                    }
                    var tempValueSet = {
                        passwordHash: result.hash
                    }
                    accountUtils.updateAccount(tempAccount.uid, tempValueSet, function(error) {
                        if (error) {
                            pageUtils.reportDatabaseErrorWithJson(error, req, res);
                            done();
                            return;
                        }
                        res.json({success: true});
                        done();
                    });
                });
            });
        });
    }, function() {});
});

router.get("/menu", checkAuthentication(PAGE_ERROR_OUTPUT), function(req, res, next) {
    var tempUsername = pageUtils.getUsername(req);
    var tempScore;
    function renderPage() {
        pageUtils.renderPage(
            res,
            pageUtils.getLocalViewPath("menu.html"),
            {},
            {
                username: tempUsername,
                score: tempScore
            }
        );
    }
    var tempPlayer = gameUtils.getPlayerByUsername(tempUsername, true);
    if (tempPlayer === null) {
        dbUtils.performTransaction(function(done) {
            accountUtils.getAccountByUsername(tempUsername, function(error, result) {
                if (error) {
                    pageUtils.reportDatabaseErrorWithPage(error, req, res);
                    done();
                    return;
                }
                tempScore = result.score;
                renderPage();
                done();
            });
        }, function() {});
    } else {
        tempScore = tempPlayer.score;
        renderPage();
    }
});

router.get("/game", checkAuthentication(PAGE_ERROR_OUTPUT), function(req, res, next) {
    var index = 0;
    var tempModuleList = ostracodMultiplayer.gameConfig.pageModules;
    while (index < tempModuleList.length) {
        var tempModule = tempModuleList[index];
        if (typeof tempModule.viewContent === "undefined"
                || ostracodMultiplayer.mode == "development") {
            tempModule.viewContent = fs.readFileSync(tempModule.viewPath, "utf8");
        }
        index += 1;
    }
    var tempInstructionsPath = pageUtils.getConsumerViewPath(
        ostracodMultiplayer.gameConfig.instructionsViewFile
    );
    var tempScriptList = ["javascript/baseGame.js"];
    var tempScriptList2 = ostracodMultiplayer.gameConfig.scripts;
    var index = 0;
    while (index < tempScriptList2.length) {
        var tempPath = tempScriptList2[index];
        tempScriptList.push(tempPath);
        index += 1;
    }
    var tempCanvasBackgroundColor;
    if ("canvasBackgroundColor" in ostracodMultiplayer.gameConfig) {
        tempCanvasBackgroundColor = ostracodMultiplayer.gameConfig.canvasBackgroundColor;
    } else {
        tempCanvasBackgroundColor = "#FFFFFF";
    }
    pageUtils.renderPage(
        res,
        pageUtils.getLocalViewPath("game.html"),
        {
            scripts: tempScriptList,
            stylesheets: ostracodMultiplayer.gameConfig.stylesheets,
            shouldDisplayTitle: false,
            contentWidth: ostracodMultiplayer.gameConfig.canvasWidth / 2 + 380
        },
        {
            modules: tempModuleList,
            canvasWidth: ostracodMultiplayer.gameConfig.canvasWidth,
            canvasHeight: ostracodMultiplayer.gameConfig.canvasHeight,
            canvasBackgroundColor: tempCanvasBackgroundColor,
            framesPerSecond: ostracodMultiplayer.gameConfig.framesPerSecond,
            gameName: ostracodMultiplayer.serverConfig.gameName.toUpperCase(),
            instructions: fs.readFileSync(tempInstructionsPath, "utf8"),
            debugMode: (ostracodMultiplayer.mode == "development")
        }
    );
});

router.ws("/gameUpdate", checkAuthentication(SOCKET_ERROR_OUTPUT), function(ws, req, next) {
    console.log("Opening socket.");
    ws.on("message", function(message) {
        var tempCommandList = JSON.parse(message);
        if (ostracodMultiplayer.mode) {
            setTimeout(function() {
                performUpdate(tempCommandList);
            }, 50 + Math.floor(Math.random() * 150));
        } else {
            performUpdate(tempCommandList);
        }
    });
    function performUpdate(commandList) {
        gameUtils.performUpdate(pageUtils.getUsername(req), commandList, function(result) {
            var tempRetryCount = 0;
            function tryToSendResponse() {
                try {
                    ws.send(JSON.stringify(result));
                } catch (error) {
                    if (tempRetryCount < 3) {
                        console.log("Trying to send response again.");
                        setTimeout(tryToSendResponse, 100);
                        tempRetryCount += 1;
                    } else {
                        console.log("Exceeded maximum number of retries.");
                    }
                }
            }
            tryToSendResponse();
        });
    }
});

router.get("/leaderboard", function(req, res, next) {
    dbUtils.performTransaction(function(done) {
        accountUtils.getLeaderboardAccounts(20, function(error, accountList) {
            if (error) {
                pageUtils.reportDatabaseErrorWithPage(error, req, res);
                done();
                return;
            }
            var index = 0;
            while (index < accountList.length) {
                var tempAccount = accountList[index];
                tempAccount.ordinalNumber = index + 1;
                index += 1;
            }
            var tempUrl = pageUtils.generateReturnUrl(req);
            pageUtils.renderPage(
                res,
                pageUtils.getLocalViewPath("leaderboard.html"),
                {},
                {
                    accountList: accountList,
                    url: tempUrl.url,
                    urlLabel: tempUrl.urlLabel
                }
            );
            done();
        });
    }, function() {});
});


