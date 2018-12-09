
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

Create a directory in your project named `ostracodMultiplayerConfig`. You will need to put the following files there:

* `ostracodMultiplayerConfig/ssl.crt`
* `ostracodMultiplayerConfig/ssl.key`
* `ostracodMultiplayerConfig/serverConfig.json`
* `ostracodMultiplayerConfig/databaseConfig.json`
* `ostracodMultiplayerConfig/schemaConfig.json`
* `ostracodMultiplayerConfig/favicon.ico` (Optional)

`ssl.crt` and `ssl.key` are the files required to enable https.

`serverConfig` should contain the following information:

```
{
    "gameName": String,
    "author": String,
    "port": Number,
    "secret": String (For cookies)
}
```

`databaseConfig.json` must have the following format:

```
{
    "host": String (Server address),
    "databaseName": String,
    "username": String,
    "password": String
}
```

`schemaConfig.json` must have this format:

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

Put your statically served files (stylesheets, images, etc.) in a top-level directory named `public`.

## Usage

This module exposes the following members:

* `ostracodMultiplayer`: Controls high-level server operations.
* `pageUtils`: Contains various functions for serving pages.
* `dbUtils`: Contains various functions for accessing the database.

`ostracodMultiplayer` contains the following members:

* `ostracodMultiplayer.initializeServer(basePath)`: Starts running the server.
* `ostracodMultiplayer.mode`: Either `"development"` or `"production"`.

`pageUtils` contains the follow members:

* `pageUtils.renderPage(res, path, parameters)`: Renders the page at `path` with given parameters using Mustache.

`dbUtils` contains the following members:

* `dbUtils.performTransaction(operation, done)`: Performs the operation with a lock on the database.
* `dbUtils.performQuery(query, parameterList, done)`: Performs a single query on the database. Will not work outside of `performTransaction`.


