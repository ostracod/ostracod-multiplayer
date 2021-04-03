
const fs = require("fs");
const pathUtils = require("path");
const express = require("express");
const router = express.Router();

const { ostracodMultiplayer } = require("./ostracodMultiplayer");
const { pageUtils } = require("./pageUtils");
const { dbUtils } = require("./dbUtils");
const { accountUtils } = require("./accountUtils");
const { gameUtils } = require("./gameUtils");

const { checkAuthentication } = pageUtils;
const {
    JSON_ERROR_OUTPUT, PAGE_ERROR_OUTPUT, SOCKET_ERROR_OUTPUT,
} = pageUtils.errorOutput;

router.get("/", (req, res, next) => {
    if (pageUtils.isAuthenticated(req)) {
        res.redirect("menu");
    } else {
        res.redirect("login");
    }
});

router.get("/login", (req, res, next) => {
    const tempWelcomePath = pageUtils.getConsumerViewPath(
        ostracodMultiplayer.serverConfig.welcomeViewFile
    );
    pageUtils.renderPage(
        res,
        pageUtils.getLocalViewPath("login.html"),
        {scripts: ["javascript/login.js"]},
        {
            author: ostracodMultiplayer.serverConfig.author,
            welcomeContent: fs.readFileSync(tempWelcomePath, "utf8"),
        },
    );
});

router.post("/loginAction", (req, res, next) => {
    const tempUsername = req.body.username;
    const tempPassword = req.body.password;
    dbUtils.performTransaction((done) => {
        accountUtils.getAccountByUsername(tempUsername, (error, result) => {
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
            accountUtils.comparePasswordWithHash(tempPassword, result.passwordHash, (result) => {
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
                res.json({ success: true });
                done();
            });
        });
    }, () => {});
});

router.get("/logoutAction", (req, res, next) => {
    if (req.session.username) {
        delete req.session["username"];
    }
    res.redirect("login");
});

router.get("/createAccount", (req, res, next) => {
    pageUtils.renderPage(
        res,
        pageUtils.getLocalViewPath("createAccount.html"),
        { scripts: ["javascript/createAccount.js"] },
        {},
    );
});

router.post("/createAccountAction", (req, res, next) => {
    const tempUsername = req.body.username;
    const tempPassword = req.body.password;
    const tempEmailAddress = req.body.emailAddress;
    if (tempUsername.length > 30) {
        res.json({
            success: false,
            message: "Your username may not be longer than 30 characters.",
        });
        return;
    }
    dbUtils.performTransaction((done) => {
        accountUtils.getAccountByUsername(tempUsername, (error, result) => {
            if (error) {
                pageUtils.reportDatabaseErrorWithJson(error, req, res);
                done();
                return;
            }
            if (result) {
                res.json({
                    success: false,
                    message: "An account with that name already exists.",
                });
                done();
                return;
            }
            accountUtils.generatePasswordHash(tempPassword, (result) => {
                if (!result.success) {
                    pageUtils.reportDatabaseErrorWithJson(result.error, req, res);
                    done();
                    return;
                }
                const tempPasswordHash = result.hash;
                accountUtils.addAccount({
                    username: tempUsername,
                    passwordHash: tempPasswordHash,
                    emailAddress: tempEmailAddress,
                }, (error) => {
                    if (error) {
                        pageUtils.reportDatabaseErrorWithJson(error, req, res);
                        done();
                        return;
                    }
                    res.json({ success: true });
                    done();
                });
            });
        });
    }, () => {});
});

router.get("/changePassword", checkAuthentication(PAGE_ERROR_OUTPUT), (req, res, next) => {
    pageUtils.renderPage(
        res,
        pageUtils.getLocalViewPath("changePassword.html"),
        { scripts: ["javascript/changePassword.js"] },
        {},
    );
});

router.post("/changePasswordAction", checkAuthentication(JSON_ERROR_OUTPUT), (req, res, next) => {
    const tempUsername = pageUtils.getUsername(req);
    const tempOldPassword = req.body.oldPassword;
    const tempNewPassword = req.body.newPassword;
    dbUtils.performTransaction((done) => {
        accountUtils.getAccountByUsername(tempUsername, (error, result) => {
            if (error) {
                pageUtils.reportDatabaseErrorWithJson(error, req, res);
                done();
                return;
            }
            const tempAccount = result;
            accountUtils.comparePasswordWithHash(tempOldPassword, tempAccount.passwordHash, (result) => {
                if (!result.success) {
                    pageUtils.reportDatabaseErrorWithJson(result.error, req, res);
                    done();
                    return;
                }
                if (!result.isMatch) {
                    res.json({ success: false, message: "Incorrect old password." });
                    done();
                    return;
                }
                accountUtils.generatePasswordHash(tempNewPassword, (result) => {
                    if (!result.success) {
                        pageUtils.reportDatabaseErrorWithJson(result.error, req, res);
                        done();
                        return;
                    }
                    const tempValueSet = { passwordHash: result.hash };
                    accountUtils.updateAccount(tempAccount.uid, tempValueSet, (error) => {
                        if (error) {
                            pageUtils.reportDatabaseErrorWithJson(error, req, res);
                            done();
                            return;
                        }
                        res.json({ success: true });
                        done();
                    });
                });
            });
        });
    }, () => {});
});

router.get("/menu", checkAuthentication(PAGE_ERROR_OUTPUT), (req, res, next) => {
    const tempUsername = pageUtils.getUsername(req);
    let tempScore;
    const renderPage = () => {
        pageUtils.renderPage(
            res,
            pageUtils.getLocalViewPath("menu.html"),
            {},
            {
                username: tempUsername,
                score: tempScore,
            },
        );
    };
    const tempPlayer = gameUtils.getPlayerByUsername(tempUsername, true);
    if (tempPlayer === null) {
        dbUtils.performTransaction((done) => {
            accountUtils.getAccountByUsername(tempUsername, (error, result) => {
                if (error) {
                    pageUtils.reportDatabaseErrorWithPage(error, req, res);
                    done();
                    return;
                }
                tempScore = result.score;
                renderPage();
                done();
            });
        }, () => {});
    } else {
        tempScore = tempPlayer.score;
        renderPage();
    }
});

router.get("/game", checkAuthentication(PAGE_ERROR_OUTPUT), (req, res, next) => {
    const tempModuleList = ostracodMultiplayer.gameConfig.pageModules;
    for (const module of tempModuleList) {
        if (typeof module.viewContent === "undefined"
                || ostracodMultiplayer.mode === "development") {
            module.viewContent = fs.readFileSync(module.viewPath, "utf8");
        }
    }
    const tempInstructionsPath = pageUtils.getConsumerViewPath(
        ostracodMultiplayer.gameConfig.instructionsViewFile,
    );
    const tempScriptList = ["javascript/baseGame.js"];
    const tempScriptList2 = ostracodMultiplayer.gameConfig.scripts;
    for (const path of tempScriptList2) {
        tempScriptList.push(path);
    }
    let tempCanvasBackgroundColor;
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
            contentWidth: ostracodMultiplayer.gameConfig.canvasWidth / 2 + 380,
        },
        {
            modules: tempModuleList,
            canvasWidth: ostracodMultiplayer.gameConfig.canvasWidth,
            canvasHeight: ostracodMultiplayer.gameConfig.canvasHeight,
            canvasBackgroundColor: tempCanvasBackgroundColor,
            framesPerSecond: ostracodMultiplayer.gameConfig.framesPerSecond,
            gameName: ostracodMultiplayer.serverConfig.gameName.toUpperCase(),
            instructions: fs.readFileSync(tempInstructionsPath, "utf8"),
            debugMode: (ostracodMultiplayer.mode === "development"),
        },
    );
});

router.ws("/gameUpdate", checkAuthentication(SOCKET_ERROR_OUTPUT), (ws, req, next) => {
    console.log("Opening socket.");
    ws.on("message", (message) => {
        const tempCommandList = JSON.parse(message);
        if (ostracodMultiplayer.mode === "development") {
            setTimeout(() => {
                performUpdate(tempCommandList);
            }, 50 + Math.floor(Math.random() * 150));
        } else {
            performUpdate(tempCommandList);
        }
    });
    const performUpdate = (commandList) => {
        gameUtils.performUpdate(pageUtils.getUsername(req), commandList, (result) => {
            let tempRetryCount = 0;
            const tryToSendResponse = () => {
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
            };
            tryToSendResponse();
        });
    };
});

router.get("/leaderboard", (req, res, next) => {
    dbUtils.performTransaction((done) => {
        accountUtils.getLeaderboardAccounts(20, (error, accountList) => {
            if (error) {
                pageUtils.reportDatabaseErrorWithPage(error, req, res);
                done();
                return;
            }
            for (let index = 0; index < accountList.length; index++) {
                const tempAccount = accountList[index];
                tempAccount.ordinalNumber = index + 1;
            }
            const tempUrl = pageUtils.generateReturnUrl(req);
            pageUtils.renderPage(
                res,
                pageUtils.getLocalViewPath("leaderboard.html"),
                {},
                {
                    accountList: accountList,
                    url: tempUrl.url,
                    urlLabel: tempUrl.urlLabel,
                },
            );
            done();
        });
    }, () => {});
});

module.exports = router;


