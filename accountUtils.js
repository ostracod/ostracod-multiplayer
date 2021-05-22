
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
        dbUtils.performQuery(
            "SELECT * FROM Users WHERE username = ?",
            [username],
            (error, results) => {
                if (error) {
                    done(dbUtils.convertSqlErrorToText(error), null);
                    return;
                }
                if (results.length > 0) {
                    done(null, results[0]);
                } else {
                    done(null, null);
                }
            },
        );
    }
    
    updateAccount(uid, valueSet, done) {
        const tempQueryTextList = [];
        const tempValueList = [];
        for (const name in valueSet) {
            var tempValue = valueSet[name];
            tempQueryTextList.push(name + " = ?");
            tempValueList.push(tempValue);
        }
        const tempQueryText = tempQueryTextList.join(", ");
        tempValueList.push(uid);
        dbUtils.performQuery(
            "UPDATE Users SET " + tempQueryText + " WHERE uid = ?",
            tempValueList,
            (error) => {
                if (error) {
                    done(dbUtils.convertSqlErrorToText(error));
                    return;
                }
                done(null);
            },
        );
    }
    
    removeAccount(uid, done) {
        dbUtils.performQuery(
            "DELETE FROM Users WHERE uid = ?",
            [uid],
            (error) => {
                if (error) {
                    done(dbUtils.convertSqlErrorToText(error));
                    return;
                }
                done(null);
            },
        );
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

const { dbUtils } = require("./dbUtils");


