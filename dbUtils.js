
var fs = require("fs");
var pathUtils = require("path");
var bcrypt = require("bcrypt");
var mysql = require("mysql");

var databaseConfig;
var databaseLock = false;
var connection;

function DbUtils() {

}

var dbUtils = new DbUtils();

module.exports = {
    dbUtils: dbUtils
};

var ostracodMultiplayer = require("./ostracodMultiplayer").ostracodMultiplayer;

DbUtils.prototype.initialize = function() {
    databaseConfig = JSON.parse(fs.readFileSync(
        pathUtils.join(ostracodMultiplayer.configDirectory, "databaseConfig.json"),
        "utf8"
    ));
}

DbUtils.prototype.generatePasswordHash = function(password, done) {
    bcrypt.hash(password, 10, function(error, result) {
        if (error) {
            done({
                success: false,
                error: error
            });
            return;
        }
        done({
            success: true,
            hash: result
        });
    });
}

DbUtils.prototype.comparePasswordWithHash = function(password, hash, done) {
    bcrypt.compare(password, hash, function(error, result) {
        if (error) {
            done({
                success: false,
                error: error
            });
            return;
        }
        done({
            success: true,
            isMatch: result
        });
    });
}

DbUtils.prototype.convertSqlErrorToText = function(error) {
    return error.code + ": " + error.sqlMessage;
}

DbUtils.prototype.startTransaction = function(done) {
    if (databaseLock) {
        setTimeout(function() {
            dbUtils.startTransaction(done);
        }, 2);
    } else {
        databaseLock = true;
        connection = mysql.createConnection({
            host: databaseConfig.host,
            user: databaseConfig.username,
            password: databaseConfig.password,
            database: databaseConfig.databaseName
        });
        connection.connect(function(error) {
            if (error) {
                console.log(accountUtils.convertSqlErrorToText(error));
                return;
            }
            done();
        });
    }
}

DbUtils.prototype.finishTransaction = function() {
    connection.destroy();
    databaseLock = false;
}

DbUtils.prototype.performTransaction = function(operation, done) {
    dbUtils.startTransaction(function() {
        operation(function() {
            dbUtils.finishTransaction();
            done();
        });
    });
}

DbUtils.prototype.performQuery = function(query, parameterList, done) {
    if (!databaseLock) {
        console.log("Missing lock!");
        return;
    }
    connection.query(query, parameterList, done);
}


