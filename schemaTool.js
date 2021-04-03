
const parseArgs = require("minimist");
const fs = require("fs");
const pathUtils = require("path");
const mysql = require("mysql");
const confirm = require("confirm-cli");

let connection = null;

const reportSqlError = (error) => {
    console.log("Could not connect to MySQL.");
    console.log(error.code);
    console.log(error.sqlMessage);
}

const exitCleanly = (exitValue) => {
    if (typeof exitValue === "undefined") {
        exitValue = 0;
    }
    if (connection !== null) {
        connection.end();
    }
    process.exit(exitValue);
}

const printUsageAndExit = () => {
    console.log("Usage:");
    console.log("node schemaTool.js setUp");
    console.log("node schemaTool.js verify");
    console.log("node schemaTool.js destroy");
    exitCleanly(1);
}

const databaseExists = (done) => {
    connection.query(
        "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
        [databaseName],
        (error, results, fields) => {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done(results.length > 0);
        },
    );
}

const tableExists = (table, done) => {
    connection.query(
        "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
        [databaseName, table.name],
        (error, results, fields) => {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done(results.length > 0);
        },
    );
}

const getTableFieldAttributes = (table, field, done) => {
    connection.query(
        "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
        [databaseName, table.name, field.name],
        (error, results, fields) => {
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
        },
    );
}

const compareTableFieldAttributes = (table, field, fieldAttributes) => {
    let outputMessageList = [];
    const tempDescription = "Field \"" + field.name + "\" of table \"" + table.name + "\"";
    let tempAttributesAreCorrect = true;
    
    let tempType = fieldAttributes.COLUMN_TYPE.toLowerCase();
    if (tempType.match(/^int\([0-9]+\)$/)) {
        tempType = "int";
    } else if (tempType.match(/^bigint\([0-9]+\)$/)) {
        tempType = "bigint";
    }
    if (tempType !== field.type.toLowerCase()) {
        outputMessageList.push(tempDescription + " has the wrong data type \"" + fieldAttributes.COLUMN_TYPE + "\". It should be \"" + field.type + "\".");
        tempAttributesAreCorrect = false;
    }
    
    let tempColumnKey = fieldAttributes.COLUMN_KEY.toUpperCase();
    let tempExpectedColumnKey;
    if ("primaryKey" in field && field.primaryKey) {
        tempExpectedColumnKey = "PRI"
    } else if ("indexed" in field && field.indexed) {
        tempExpectedColumnKey = "MUL";
    } else {
        tempExpectedColumnKey = "";
    }
    if (tempColumnKey !== tempExpectedColumnKey) {
        outputMessageList.push(tempDescription + " has the wrong COLUMN_KEY value.");
        tempAttributesAreCorrect = false;
    }
    
    const tempIsAutoIncrement = (fieldAttributes.EXTRA.toLowerCase() === "auto_increment")
    let tempShouldBeAutoIncrement;
    if ("autoIncrement" in field) {
        tempShouldBeAutoIncrement = field.autoIncrement;
    } else {
        tempShouldBeAutoIncrement = false;
    }
    if (tempIsAutoIncrement !== tempShouldBeAutoIncrement) {
        outputMessageList.push(tempDescription + " has the wrong EXTRA value.");
        tempAttributesAreCorrect = false;
    }
    
    if (tempAttributesAreCorrect) {
        outputMessageList = [tempDescription + " exists and has the correct attributes."];
    }
    return {
        isCorrect: tempAttributesAreCorrect,
        message: outputMessageList.join("\n"),
    };
}

const createDatabase = (done) => {
    connection.query(
        "CREATE DATABASE " + databaseName,
        [],
        (error, results, fields) => {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done();
        },
    );
}

const getFieldDefinition = (field) => {
    let output = field.name + " " + field.type;
    if ("autoIncrement" in field) {
        if (field.autoIncrement) {
            output += " AUTO_INCREMENT";
        }
    }
    return output;
}

const createTable = (table, done) => {
    const fieldDefinitionList = [];
    for (const field of table.fields) {
        const tempDefinition = getFieldDefinition(field);
        fieldDefinitionList.push(tempDefinition);
    }
    for (const field of table.fields) {
        if ("primaryKey" in field && field.primaryKey) {
            fieldDefinitionList.push(`PRIMARY KEY (${field.name})`);
        }
        if ("indexed" in field && field.indexed) {
            fieldDefinitionList.push(`INDEX (${field.name})`);
        }
    }
    connection.query(
        "CREATE TABLE " + databaseName + "." + table.name + " (" + fieldDefinitionList.join(", ") + ")",
        [],
        (error, results, fields) => {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done();
        },
    );
}

const addTableField = (table, field, done) => {
    const tempDefinition = getFieldDefinition(field);
    let tempStatement = `ALTER TABLE ${databaseName}.${table.name} ADD COLUMN ${tempDefinition}`;
    if ("indexed" in field && field.indexed) {
        tempStatement += `, ADD INDEX (${field.name})`;
    }
    connection.query(
        tempStatement,
        [],
        (error, results, fields) => {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done();
        },
    );
}

const deleteDatabase = (done) => {
    connection.query(
        "DROP DATABASE " + databaseName,
        [],
        (error, results, fields) => {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done();
        },
    );
}

const setUpTableField = (table, field, done) => {
    getTableFieldAttributes(table, field, (fieldAttributes) => {
        if (fieldAttributes !== null) {
            const tempResult = compareTableFieldAttributes(table, field, fieldAttributes);
            console.log(tempResult.message);
            if (!tempResult.isCorrect) {
                console.log("Aborting.");
                exitCleanly();
            }
            done();
            return;
        }
        console.log("Adding field \"" + field.name + "\" to table \"" + table.name + "\"...");
        addTableField(table, field, () => {
            console.log("Added field \"" + field.name + "\" to table \"" + table.name + "\".");
            done();
        });
    });
}

const setUpTableFields = (table, done) => {
    let index = 0;
    const setUpNextTableField = () => {
        if (index >= table.fields.length) {
            done();
            return;
        }
        const tempField = table.fields[index];
        index += 1;
        setUpTableField(table, tempField, setUpNextTableField);
    };
    setUpNextTableField();
}

const setUpTable = (table, done) => {
    tableExists(table, (exists) => {
        if (exists) {
            console.log("Table \"" + table.name + "\" already exists.");
            setUpTableFields(table, done);
            return;
        }
        console.log("Creating table \"" + table.name + "\"...");
        createTable(table, () => {
            console.log("Created table \"" + table.name + "\".");
            done();
        });
    });
}

const setUpTables = (done) => {
    let index = 0;
    const setUpNextTable = () => {
        if (index >= schemaConfig.tables.length) {
            done();
            return;
        }
        const tempTable = schemaConfig.tables[index];
        index += 1;
        setUpTable(tempTable, setUpNextTable);
    };
    setUpNextTable();
}

const setUpDatabase = (done) => {
    databaseExists((exists) => {
        if (exists) {
            console.log("Database \"" + databaseName + "\" already exists.");
            setUpTables(done);
            return;
        }
        console.log("Creating database \"" + databaseName + "\"...");
        createDatabase(() => {
            console.log("Created database \"" + databaseName + "\".");
            setUpTables(done);
        });
    });
}

const setUpSchemaCommand = () => {
    console.log("Setting up database...");
    setUpDatabase(() => {
        console.log("Finished setting up database \"" + databaseName + "\".");
        exitCleanly();
    });
}

const verifyTableField = (table, field, done) => {
    getTableFieldAttributes(table, field, (fieldAttributes) => {
        if (fieldAttributes === null) {
            console.log("Field \"" + field.name + "\" of table \"" + table.name + "\" is missing.");
            done();
            return;
        }
        const tempResult = compareTableFieldAttributes(table, field, fieldAttributes);
        console.log(tempResult.message);
        done();
    });
}

const verifyTableFields = (table, done) => {
    let index = 0;
    const verifyNextTableField = () => {
        if (index >= table.fields.length) {
            done();
            return;
        }
        const tempField = table.fields[index];
        index += 1;
        verifyTableField(table, tempField, verifyNextTableField);
    };
    verifyNextTableField();
}

const verifyTable = (table, done) => {
    tableExists(table, (exists) => {
        if (!exists) {
            console.log("Table \"" + table.name + "\" is missing.");
            done();
            return;
        }
        console.log("Table \"" + table.name + "\" exists.");
        verifyTableFields(table, done);
    });
}

const verifyTables = (done) => {
    let index = 0;
    const verifyNextTable = () => {
        if (index >= schemaConfig.tables.length) {
            done();
            return;
        }
        const tempTable = schemaConfig.tables[index];
        index += 1;
        verifyTable(tempTable, verifyNextTable);
    };
    verifyNextTable();
}

const verifyDatabase = (done) => {
    databaseExists((exists) => {
        if (!exists) {
            console.log("Database \"" + databaseName + "\" is missing.");
            done();
            return;
        }
        console.log("Database \"" + databaseName + "\" exists.");
        verifyTables(done);
    });
}

const verifySchemaCommand = () => {
    console.log("Verifying database...");
    verifyDatabase(() => {
        console.log("Finished verifying database.");
        exitCleanly();
    });
}

const destroyDatabase = () => {
    console.log("Destroying database...");
    databaseExists((exists) => {
        if (!exists) {
            console.log("Database is already missing.");
            exitCleanly();
            return;
        }
        deleteDatabase(() => {
            console.log("Destroyed database.");
            exitCleanly();
        });
    });
}

const destroySchemaCommand = () => {
    confirm(
        "Are you sure you want to destroy the database \"" + databaseName + "\"?",
        () => {
            destroyDatabase();
        },
        () => {
            console.log("Database NOT destroyed.");
            exitCleanly();
        },
        { text: ["Destroy", "Cancel"] },
    );
}

const processCli = () => {
    
    const command = args["_"][0].toLowerCase();
    
    if (command === "setup") {
        setUpSchemaCommand();
    } else if (command === "destroy") {
        destroySchemaCommand();
    } else if (command === "verify") {
        verifySchemaCommand();
    } else {
        printUsageAndExit();
    }
}

const baseDirectory = "./ostracodMultiplayerConfig";

if (!fs.existsSync(baseDirectory)) {
    console.log("Could not find " + baseDirectory + ".");
    console.log("Make sure your current working directory is correct!");
    exitCleanly(1);
}

const databaseConfigPath = pathUtils.join(baseDirectory, "databaseConfig.json");
const schemaConfigPath = pathUtils.join(baseDirectory, "schemaConfig.json");

const databaseConfig = JSON.parse(fs.readFileSync(databaseConfigPath, "utf8"));
const schemaConfig = JSON.parse(fs.readFileSync(schemaConfigPath, "utf8"));
const databaseName = databaseConfig.databaseName

const args = parseArgs(process.argv.slice(2));

if (args["_"].length <= 0) {
    printUsageAndExit();
}

console.log("Connecting to MySQL...");

connection = mysql.createConnection({
    host: databaseConfig.host,
    user: databaseConfig.username,
    password: databaseConfig.password,
});

connection.connect((error) => {
    if (error) {
        reportSqlError(error);
        exitCleanly();
        return;
    }
    console.log("Connected.");
    processCli();
});


