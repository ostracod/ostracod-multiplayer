
var parseArgs = require("minimist");
var fs = require("fs");
var pathUtils = require("path");
var mysql = require("mysql");
var confirm = require("confirm-cli");

var connection = null;

function reportSqlError(error) {
    console.log("Could not connect to MySQL.");
    console.log(error.code);
    console.log(error.sqlMessage);
}

function exitCleanly(exitValue) {
    if (typeof exitValue === "undefined") {
        exitValue = 0;
    }
    if (connection !== null) {
        connection.end();
    }
    process.exit(exitValue);
}

function printUsageAndExit() {
    console.log("Usage:");
    console.log("node schemaTool.js setUp");
    console.log("node schemaTool.js verify");
    console.log("node schemaTool.js destroy");
    exitCleanly(1);
}

function databaseExists(done) {
    connection.query(
        "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
        [databaseName],
        function (error, results, fields) {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done(results.length > 0);
        }
    );
}

function tableExists(table, done) {
    connection.query(
        "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
        [databaseName, table.name],
        function (error, results, fields) {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done(results.length > 0);
        }
    );
}

function getTableFieldAttributes(table, field, done) {
    connection.query(
        "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
        [databaseName, table.name, field.name],
        function (error, results, fields) {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            if (results.length > 0) {
                done(results[0]);
            } else {
                done(null);
            }
        }
    );
}

function compareTableFieldAttributes(table, field, fieldAttributes) {
    var outputMessageList = [];
    var tempDescription = "Field \"" + field.name + "\" of table \"" + table.name + "\"";
    var tempAttributesAreCorrect = true;
    var tempType = fieldAttributes.COLUMN_TYPE.toLowerCase();
    if (tempType.match(/^int\([0-9]+\)$/)) {
        tempType = "int";
    } else if (tempType.match(/^bigint\([0-9]+\)$/)) {
        tempType = "bigint";
    }
    if (tempType != field.type.toLowerCase()) {
        outputMessageList.push(tempDescription + " has the wrong data type \"" + fieldAttributes.COLUMN_TYPE + "\". It should be \"" + field.type + "\".");
        tempAttributesAreCorrect = false;
    }
    var tempIsPrimaryKey = (fieldAttributes.COLUMN_KEY.toUpperCase() == "PRI")
    var tempShouldBePrimaryKey;
    if ("primaryKey" in field) {
        tempShouldBePrimaryKey = field.primaryKey;
    } else {
        tempShouldBePrimaryKey = false;
    }
    if (tempIsPrimaryKey != tempShouldBePrimaryKey) {
        outputMessageList.push(tempDescription + " has the wrong COLUMN_KEY value.");
        tempAttributesAreCorrect = false;
    }
    var tempIsAutoIncrement = (fieldAttributes.EXTRA.toLowerCase() == "auto_increment")
    var tempShouldBeAutoIncrement;
    if ("autoIncrement" in field) {
        tempShouldBeAutoIncrement = field.autoIncrement;
    } else {
        tempShouldBeAutoIncrement = false;
    }
    if (tempIsAutoIncrement != tempShouldBeAutoIncrement) {
        outputMessageList.push(tempDescription + " has the wrong EXTRA value.");
        tempAttributesAreCorrect = false;
    }
    if (tempAttributesAreCorrect) {
        outputMessageList = [tempDescription + " exists and has the correct attributes."];
    }
    return {
        isCorrect: tempAttributesAreCorrect,
        message: outputMessageList.join("\n")
    };
}

function createDatabase(done) {
    connection.query(
        "CREATE DATABASE " + databaseName,
        [],
        function (error, results, fields) {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done();
        }
    );
}

function getFieldDefinition(field) {
    var output = field.name + " " + field.type;
    if ("autoIncrement" in field) {
        if (field.autoIncrement) {
            output += " AUTO_INCREMENT";
        }
    }
    return output;
}

function createTable(table, done) {
    var fieldDefinitionList = [];
    var primaryKeyField = null;
    var index = 0;
    while (index < table.fields.length) {
        var tempField = table.fields[index];
        var tempDefinition = getFieldDefinition(tempField);
        fieldDefinitionList.push(tempDefinition);
        if ("primaryKey" in tempField) {
            if (tempField.primaryKey) {
                primaryKeyField = tempField;
            }
        }
        index += 1;
    }
    if (primaryKeyField !== null) {
        fieldDefinitionList.push("PRIMARY KEY (" + primaryKeyField.name + ")");
    }
    connection.query(
        "CREATE TABLE " + databaseName + "." + table.name + " (" + fieldDefinitionList.join(", ") + ")",
        [],
        function (error, results, fields) {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done();
        }
    );
}

function addTableField(table, field, done) {
    var tempDefinition = getFieldDefinition(field);
    connection.query(
        "ALTER TABLE " + databaseName + "." + table.name + " ADD COLUMN " + tempDefinition,
        [],
        function (error, results, fields) {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done();
        }
    );
}

function deleteDatabase(done) {
    connection.query(
        "DROP DATABASE " + databaseName,
        [],
        function (error, results, fields) {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done();
        }
    );
}

function setUpTableField(table, field, done) {
    getTableFieldAttributes(table, field, function(fieldAttributes) {
        if (fieldAttributes !== null) {
            var tempResult = compareTableFieldAttributes(table, field, fieldAttributes);
            console.log(tempResult.message);
            if (!tempResult.isCorrect) {
                console.log("Aborting.");
                exitCleanly();
            }
            done();
            return;
        }
        console.log("Adding field \"" + field.name + "\" to table \"" + table.name + "\"...");
        addTableField(table, field, function() {
            console.log("Added field \"" + field.name + "\" to table \"" + table.name + "\".");
            done();
        });
    });
}

function setUpTableFields(table, done) {
    var index = 0;
    function setUpNextTableField() {
        if (index >= table.fields.length) {
            done();
            return;
        }
        var tempField = table.fields[index];
        index += 1;
        setUpTableField(table, tempField, setUpNextTableField);
    }
    setUpNextTableField();
}

function setUpTable(table, done) {
    tableExists(table, function(exists) {
        if (exists) {
            console.log("Table \"" + table.name + "\" already exists.");
            setUpTableFields(table, done);
            return;
        }
        console.log("Creating table \"" + table.name + "\"...");
        createTable(table, function() {
            console.log("Created table \"" + table.name + "\".");
            done();
        });
    });
}

function setUpTables(done) {
    var index = 0;
    function setUpNextTable() {
        if (index >= schemaConfig.tables.length) {
            done();
            return;
        }
        var tempTable = schemaConfig.tables[index];
        index += 1;
        setUpTable(tempTable, setUpNextTable);
    }
    setUpNextTable();
}

function setUpDatabase(done) {
    databaseExists(function(exists) {
        if (exists) {
            console.log("Database \"" + databaseName + "\" already exists.");
            setUpTables(done);
            return;
        }
        console.log("Creating database \"" + databaseName + "\"...");
        createDatabase(function() {
            console.log("Created database \"" + databaseName + "\".");
            setUpTables(done);
        });
    });
}

function setUpSchemaCommand() {
    console.log("Setting up database...");
    setUpDatabase(function() {
        console.log("Finished setting up database \"" + databaseName + "\".");
        exitCleanly();
    });
}

function verifyTableField(table, field, done) {
    getTableFieldAttributes(table, field, function(fieldAttributes) {
        if (fieldAttributes === null) {
            console.log("Field \"" + field.name + "\" of table \"" + table.name + "\" is missing.");
            done();
            return;
        }
        var tempResult = compareTableFieldAttributes(table, field, fieldAttributes);
        console.log(tempResult.message);
        done();
    });
}

function verifyTableFields(table, done) {
    var index = 0;
    function verifyNextTableField() {
        if (index >= table.fields.length) {
            done();
            return;
        }
        var tempField = table.fields[index];
        index += 1;
        verifyTableField(table, tempField, verifyNextTableField);
    }
    verifyNextTableField();
}

function verifyTable(table, done) {
    tableExists(table, function(exists) {
        if (!exists) {
            console.log("Table \"" + table.name + "\" is missing.");
            done();
            return;
        }
        console.log("Table \"" + table.name + "\" exists.");
        verifyTableFields(table, done);
    });
}

function verifyTables(done) {
    var index = 0;
    function verifyNextTable() {
        if (index >= schemaConfig.tables.length) {
            done();
            return;
        }
        var tempTable = schemaConfig.tables[index];
        index += 1;
        verifyTable(tempTable, verifyNextTable);
    }
    verifyNextTable();
}

function verifyDatabase(done) {
    databaseExists(function(exists) {
        if (!exists) {
            console.log("Database \"" + databaseName + "\" is missing.");
            done();
            return;
        }
        console.log("Database \"" + databaseName + "\" exists.");
        verifyTables(done);
    });
}

function verifySchemaCommand() {
    console.log("Verifying database...");
    verifyDatabase(function() {
        console.log("Finished verifying database.");
        exitCleanly();
    });
}

function destroyDatabase() {
    console.log("Destroying database...");
    databaseExists(function(exists) {
        if (!exists) {
            console.log("Database is already missing.");
            exitCleanly();
            return;
        }
        deleteDatabase(function() {
            console.log("Destroyed database.");
            exitCleanly();
        });
    });
}

function destroySchemaCommand() {
    confirm(
        "Are you sure you want to destroy the database \"" + databaseName + "\"?",
        function () {
            destroyDatabase();
        },
        function () {
            console.log("Database NOT destroyed.");
            exitCleanly();
        },
        {text: ["Destroy", "Cancel"]}
    );
}

function processCli() {
    
    var command = args["_"][0].toLowerCase();
    
    if (command == "setup") {
        setUpSchemaCommand();
    } else if (command == "destroy") {
        destroySchemaCommand();
    } else if (command == "verify") {
        verifySchemaCommand();
    } else {
        printUsageAndExit();
    }
}

var baseDirectory = "./ostracodMultiplayerConfig";

if (!fs.existsSync(baseDirectory)) {
    console.log("Could not find " + baseDirectory + ".");
    console.log("Make sure your current working directory is correct!");
    exitCleanly(1);
}

var databaseConfigPath = pathUtils.join(baseDirectory, "databaseConfig.json");
var schemaConfigPath = pathUtils.join(baseDirectory, "schemaConfig.json");

var databaseConfig = JSON.parse(fs.readFileSync(databaseConfigPath, "utf8"));
var schemaConfig = JSON.parse(fs.readFileSync(schemaConfigPath, "utf8"));
var databaseName = databaseConfig.databaseName

var args = parseArgs(process.argv.slice(2));

if (args["_"].length <= 0) {
    printUsageAndExit();
}

console.log("Connecting to MySQL...");

connection = mysql.createConnection({
    host: databaseConfig.host,
    user: databaseConfig.username,
    password: databaseConfig.password
});

connection.connect(function(error) {
    if (error) {
        reportSqlError(error);
        exitCleanly();
        return;
    }
    console.log("Connected.");
    processCli();
});


