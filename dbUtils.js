
const fs = require("fs");
const pathUtils = require("path");
const mysql = require("mysql");

class DbUtils {
    
    initialize() {
        this.databaseConfig = JSON.parse(fs.readFileSync(
            pathUtils.join(ostracodMultiplayer.configDirectory, "databaseConfig.json"),
            "utf8",
        ));
        this.databaseLock = false;
        this.connection = null;
    }
    
    convertSqlErrorToText(error) {
        return error.code + ": " + error.sqlMessage;
    }
    
    startTransaction(done) {
        if (this.databaseLock) {
            setTimeout(() => {
                dbUtils.startTransaction(done);
            }, 2);
        } else {
            this.databaseLock = true;
            this.connection = mysql.createConnection({
                host: this.databaseConfig.host,
                user: this.databaseConfig.username,
                password: this.databaseConfig.password,
                database: this.databaseConfig.databaseName,
            });
            this.connection.connect((error) => {
                if (error) {
                    console.log(dbUtils.convertSqlErrorToText(error));
                    return;
                }
                done();
            });
        }
    }
    
    finishTransaction() {
        this.connection.destroy();
        this.databaseLock = false;
    }
    
    performTransaction(operation, done) {
        return niceUtils.performAsyncOperation((callback) => {
            dbUtils.startTransaction(() => {
                niceUtils.performAsyncOperation(operation, 0, () => {
                    dbUtils.finishTransaction();
                    callback();
                });
            });
        }, 0, done);
    }
    
    performQuery(query, parameterList, done) {
        if (!this.databaseLock) {
            console.log("Missing lock!");
            return;
        }
        return niceUtils.performAsyncOperation((callback) => {
            this.connection.query(query, parameterList, callback);
        }, 3, done);
    }
}

const dbUtils = new DbUtils();

module.exports = { dbUtils };

const { niceUtils } = require("./niceUtils");
const { ostracodMultiplayer } = require("./ostracodMultiplayer");


