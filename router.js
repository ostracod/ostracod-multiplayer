
var pathUtils = require("path");
var express = require("express");
var router = express.Router();

module.exports = router;

var ostracodMultiplayer = require("./ostracodMultiplayer").ostracodMultiplayer;
var pageUtils = require("./pageUtils").pageUtils;
var dbUtils = require("./dbUtils").dbUtils;
var accountUtils = require("./accountUtils").accountUtils;

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
    pageUtils.renderPage(
        res,
        pageUtils.getLocalViewPath("login.html"),
        ["javascript/login.js"],
        {author: ostracodMultiplayer.serverConfig.author}
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
        ["javascript/createAccount.js"],
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
        ["javascript/changePassword.js"],
        {}
    );
});

router.post("/changePasswordAction", checkAuthentication(JSON_ERROR_OUTPUT), function(req, res, next) {
    var tempUsername = req.session.username;
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
    tempUsername = req.session.username;
    pageUtils.renderPage(
        res,
        pageUtils.getLocalViewPath("menu.html"),
        [],
        {
            username: tempUsername,
            score: 0 // TODO: Populate score.
        }
    );
});


