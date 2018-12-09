
var express = require("express");
var router = express.Router();

module.exports = router;

var pageUtils = require("./pageUtils").pageUtils;
var dbUtils = require("./dbUtils").dbUtils;

router.get("/test", function(req, res, next) {
    dbUtils.performTransaction(
        function(done) {
            dbUtils.performQuery(
                "SELECT * FROM Users",
                [],
                function(error, results, fields) {
                    console.log(results);
                    done();
                }
            );
        },
        function() {
            pageUtils.renderPage(res, "./views/test.html", {message: "It works!"});
        }
    );
});


