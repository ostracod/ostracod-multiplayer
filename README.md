
# OstracodMultiplayer

A Node.js module for browser-based multiplayer games

Created by Jack Eisenmann

## Motivation

I have created a handful of Node.js browser games now, and I've copied a lot of code between them. Naturally I started to feel uncomfortable copying and pasting code, so I created this module.

Feel free to use this module for yourself, but I really designed it for my own use. If you have any questions, I'd be happy to answer them!

## Installation

This module requires MySQL version 5.x. To install on macOS:

```
brew install mysql@5.7
brew services start mysql@5.7
```

To install on Ubuntu, I recommend [this page](https://www.digitalocean.com/community/tutorials/how-to-install-mysql-on-ubuntu-16-04).

To install the Node.js module:

```
npm install github:ostracod/ostracod-multiplayer
```

Your project should have these directories at the top level:

* `(Your Project)/ostracodMultiplayerConfig`: Set-up files for this library
* `(Your Project)/views`: HTML files
* `(Your Project)/public`: Statically served files such as images and scripts

The directory `ostracodMultiplayerConfig` should contain these files:

* `ostracodMultiplayerConfig/ssl.crt`
* `ostracodMultiplayerConfig/ssl.key`
* `ostracodMultiplayerConfig/serverConfig.json`
* `ostracodMultiplayerConfig/gameConfig.json`
* `ostracodMultiplayerConfig/databaseConfig.json`
* `ostracodMultiplayerConfig/schemaConfig.json`
* `ostracodMultiplayerConfig/favicon.ico` (Optional)

`ssl.crt` and `ssl.key` are the files required to enable https.

Format of `serverConfig.json`:

```
{
    "gameName": String,
    "author": String,
    "port": Number,
    "secret": String (For cookies)
}
```

Format of `gameConfig.json`:

```
{
    "pageModules": [
        {
            "name": String,
            "buttonLabel": String,
            "title": String,
            "viewFile": String,
            "shouldShowOnLoad": Boolean
        }
    ],
    "instructionsViewFile": String
}
```

Format of `databaseConfig.json`:

```
{
    "host": String (Server address),
    "databaseName": String,
    "username": String,
    "password": String
}
```

Format of `schemaConfig.json`:

```
{
    "tables": [
        {
            "name": String,
            "fields": [
                {
                    "name": String,
                    "type": String,
                    "primaryKey": Boolean (Optional),
                    "autoIncrement": Boolean (Optional)
                }
            ]
        }
    ]
}
```

For a minimal setup, your database must include at least this table:

```
{
    "name": "Users",
    "fields": [
        {"name": "uid", "type": "INT", "primaryKey": true, "autoIncrement": true},
        {"name": "username", "type": "VARCHAR(100)"},
        {"name": "passwordHash", "type": "VARCHAR(100)"},
        {"name": "emailAddress", "type": "VARCHAR(200)"},
        {"name": "score", "type": "BIGINT"},
    ]
}
```

To set up your database, set your current working directory to the top level of your project, then invoke `schemaTool.js`:

```
cd (Path to your project)
node ./node_modules/ostracod-multiplayer/schemaTool.js setup
```

You can also replace `setup` with `verify` or `destroy` for other actions.

## Usage

This module exposes the following members:

* `ostracodMultiplayer`: Controls high-level server operations.
* `pageUtils`: Contains various functions for serving pages.
* `dbUtils`: Contains various functions for accessing the database.
* `accountUtils`: Contains various functions for processing user accounts.

`ostracodMultiplayer` contains the following members:

* `ostracodMultiplayer.initializeServer(basePath)`: Starts running the server. `basePath` should point to the top level of your project.
* `ostracodMultiplayer.mode`: Either `"development"` or `"production"`.

`pageUtils` contains the follow members:

* `pageUtils.renderPage(res, path, parameters)`: Renders the page at `path` with given parameters using Mustache. `path` must be fully resolved.
* `pageUtils.isAuthenticated(req)`: Returns whether the user is logged in based on the given request.
* `pageUtils.errorOutput`: Enumeration containing `JSON_ERROR_OUTPUT`, `PAGE_ERROR_OUTPUT`, and `SOCKET_ERROR_OUTPUT`.
* `pageUtils.checkAuthentication(errorOutput)`: Prevents a user from accessing a page if they are not logged in.

`dbUtils` contains the following members:

* `dbUtils.performTransaction(operation, done)`: Performs the operation with a lock on the database.
* `dbUtils.performQuery(query, parameterList, done)`: Performs a single query on the database. Will not work outside of `performTransaction`.

`accountUtils` contains the following members:

* `accountUtils.getAccountByUsername(username, done)`: Retrieves a user by username. Must be performed in a DB transaction.
* `accountUtils.updateAccount(uid, valueSet, done)`: Modifies fields in a user account. Must be performed in a DB transaction.
* `accountUtils.removeAccount(uid, done)`: Removes a user account. Must be performed in a DB transaction.

To run your project for development, perform this command:

```
NODE_ENV=development node (Your Script)
```

In the development environment, various security features are deactivated to facilitate testing. Do NOT use the development environment on a production server!

For a production environment, perform something like this:

```
NODE_ENV=production nohup node (Your Script) > serverMessages.txt 2>&1 &
```


