
var bcrypt = require("bcrypt");

function AccountUtils() {

}

var accountUtils = new AccountUtils();

module.exports = {
    accountUtils: accountUtils
};

var dbUtils = require("./dbUtils").dbUtils;

AccountUtils.prototype.generatePasswordHash = function(password, done) {
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

AccountUtils.prototype.comparePasswordWithHash = function(password, hash, done) {
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

AccountUtils.prototype.addAccount = function(account, done) {
    dbUtils.performQuery(
        "INSERT INTO Users (username, passwordHash, emailAddress, score) VALUES (?, ?, ?, 0)",
        [account.username, account.passwordHash, account.emailAddress],
        function (error, results, fields) {
            if (error) {
                done(dbUtils.convertSqlErrorToText(error));
                return;
            }
            done(null);
        }
    );
}

AccountUtils.prototype.getAccountByUsername = function(username, done) {
    dbUtils.performQuery(
        "SELECT * FROM Users WHERE username = ?",
        [username],
        function (error, results, fields) {
            if (error) {
                done(dbUtils.convertSqlErrorToText(error), null);
                return;
            }
            if (results.length > 0) {
                done(null, results[0]);
            } else {
                done(null, null);
            }
        }
    );
}

AccountUtils.prototype.updateAccount = function(uid, valueSet, done) {
    var tempQueryTextList = [];
    var tempValueList = [];
    for (name in valueSet) {
        var tempValue = valueSet[name];
        tempQueryTextList.push(name + " = ?");
        tempValueList.push(tempValue);
    }
    var tempQueryText = tempQueryTextList.join(", ");
    tempValueList.push(uid);
    dbUtils.performQuery(
        "UPDATE Users SET " + tempQueryText + " WHERE uid = ?",
        tempValueList,
        function (error, results, fields) {
            if (error) {
                done(dbUtils.convertSqlErrorToText(error));
                return;
            }
            done(null);
        }
    );
}

AccountUtils.prototype.removeAccount = function(index, done) {
    dbUtils.performQuery(
        "DELETE FROM Users WHERE uid = ?",
        [account.uid],
        function (error, results, fields) {
            if (error) {
                done(dbUtils.convertSqlErrorToText(error));
                return;
            }
            done(null);
        }
    );
}

AccountUtils.prototype.getLeaderboardAccounts = function(amount, done) {
    dbUtils.performQuery(
        "SELECT * FROM Users ORDER BY score DESC LIMIT 20",
        [],
        function (error, results, fields) {
            if (error) {
                done(dbUtils.convertSqlErrorToText(error), null);
                return;
            }
            done(null, results);
        }
    );
}


