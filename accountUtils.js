
const bcrypt = require("bcrypt");

class AccountUtils {
    
    generatePasswordHash(password, done) {
        bcrypt.hash(password, 10, (error, result) => {
            if (error) {
                done({ success: false, error });
                return;
            }
            done({
                success: true,
                hash: result,
            });
        });
    }

    comparePasswordWithHash(password, hash, done) {
        bcrypt.compare(password, hash, (error, result) => {
            if (error) {
                done({ success: false, error });
                return;
            }
            done({
                success: true,
                isMatch: result,
            });
        });
    }
    
    addAccount(account, done) {
        dbUtils.performQuery(
            "INSERT INTO Users (username, passwordHash, emailAddress, score) VALUES (?, ?, ?, 0)",
            [account.username, account.passwordHash, account.emailAddress],
            (error) => {
                if (error) {
                    done(dbUtils.convertSqlErrorToText(error));
                    return;
                }
                done(null);
            },
        );
    }
    
    getAccountByUsername(username, done) {
        return niceUtils.performAsyncOperation((callback) => {
            dbUtils.performQuery(
                "SELECT * FROM Users WHERE username = ?",
                [username],
                (error, results) => {
                    if (error) {
                        callback(dbUtils.convertSqlErrorToText(error), null);
                        return;
                    }
                    if (results.length > 0) {
                        callback(null, results[0]);
                    } else {
                        callback(null, null);
                    }
                },
            );
        }, 2, done);
    }
    
    updateAccount(uid, valueSet, done) {
        const tempQueryTextList = [];
        const tempValueList = [];
        for (const name in valueSet) {
            const tempValue = valueSet[name];
            tempQueryTextList.push(name + " = ?");
            tempValueList.push(tempValue);
        }
        const tempQueryText = tempQueryTextList.join(", ");
        tempValueList.push(uid);
        return niceUtils.performAsyncOperation((callback) => {
            dbUtils.performQuery(
                "UPDATE Users SET " + tempQueryText + " WHERE uid = ?",
                tempValueList,
                (error) => {
                    if (error) {
                        callback(dbUtils.convertSqlErrorToText(error));
                        return;
                    }
                    callback(null);
                },
            );
        }, 1, done);
    }
    
    removeAccount(uid, done) {
        return niceUtils.performAsyncOperation((callback) => {
            dbUtils.performQuery(
                "DELETE FROM Users WHERE uid = ?",
                [uid],
                (error) => {
                    if (error) {
                        callback(dbUtils.convertSqlErrorToText(error));
                        return;
                    }
                    callback(null);
                },
            );
        }, 1, done);
    }
    
    getLeaderboardAccounts(amount, done) {
        dbUtils.performQuery(
            "SELECT * FROM Users ORDER BY score DESC LIMIT 20",
            [],
            (error, results) => {
                if (error) {
                    done(dbUtils.convertSqlErrorToText(error), null);
                    return;
                }
                done(null, results);
            },
        );
    }
}

const accountUtils = new AccountUtils();

module.exports = { accountUtils };

const { niceUtils } = require("./niceUtils");
const { dbUtils } = require("./dbUtils");


