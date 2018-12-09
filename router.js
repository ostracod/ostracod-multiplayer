
var pathUtils = require("path");
var express = require("express");
var router = express.Router();

module.exports = router;

var ostracodMultiplayer = require("./ostracodMultiplayer").ostracodMultiplayer;
var pageUtils = require("./pageUtils").pageUtils;
var dbUtils = require("./dbUtils").dbUtils;
var accountUtils = require("./accountUtils").accountUtils;

router.get("/login", function(req, res, next) {
    pageUtils.renderPage(
        res,
        pageUtils.getLocalViewPath("login.html"),
        ["javascript/login.js"],
        {author: ostracodMultiplayer.serverConfig.author}
    );
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
                    accountUtils.releaseLock();
                    pageUtils.reportDatabaseErrorWithJson(result.error, req, res);
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


