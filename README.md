
# OstracodMultiplayer

A Node.js module for browser-based multiplayer games

Created by Jack Eisenmann

## Motivation

I have created a handful of Node.js browser games now, and I've copied a lot of code between them. Naturally I started to feel uncomfortable copying and pasting code, so I created this module.

Feel free to use this module for yourself, but I really designed it for my own use. If you have any questions, I'd be happy to answer them!

## Installation

This module requires MySQL version 8.x. To install on macOS:

```
brew install mysql@8.0
brew services start mysql@8.0
```

To install on Ubuntu, I recommend [this page](https://www.digitalocean.com/community/tutorials/how-to-install-mysql-on-ubuntu-20-04).

Then update authentication to allow username + password combination:

```
mysql -u your_username -p
ALTER USER 'your_username'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
quit
```

To install the Node.js module:

```
npm install "github:ostracod/ostracod-multiplayer#semver:^(Version)"
```

Your project should have these directories at the top level:

* `(Your Project)/ostracodMultiplayerConfig`: Set-up files for this library
* `(Your Project)/views`: HTML files
* `(Your Project)/public`: Statically served files such as images and scripts

The directory `ostracodMultiplayerConfig` should contain these files:

* `ostracodMultiplayerConfig/ssl.crt`
* `ostracodMultiplayerConfig/ssl.key`
* `ostracodMultiplayerConfig/ssl.ca-bundle` (Optional)
* `ostracodMultiplayerConfig/serverConfig.json`
* `ostracodMultiplayerConfig/gameConfig.json`
* `ostracodMultiplayerConfig/databaseConfig.json`
* `ostracodMultiplayerConfig/schemaConfig.json`
* `ostracodMultiplayerConfig/favicon.ico` (Optional)

`ssl.crt` and `ssl.key` are the files required to enable https. `ssl.ca-bundle` may also be necessary depending on your certificate provider.

Format of `serverConfig.json`:

```
{
    "gameName": String,
    "author": String,
    "port": Number,
    "secret": String (Optional, for cookies),
    "welcomeViewFile": String,
    "stylesheets": [String]
}
```

* If `secret` is excluded, the server will automatically generate a secret string.
* `welcomeViewFile` should be a file name inside your `views` directory.
* `stylesheets` is a list of stylesheet paths to include in every page.

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
    "scripts": [String],
    "stylesheets": [String],
    "canvasWidth": Number,
    "canvasHeight": Number,
    "canvasPixelScale": Number (Optional),
    "canvasBackgroundColor": String (Optional),
    "framesPerSecond": Number,
    "maximumPlayerCount": Number
}
```

* `instructionsViewFile` should be a file name inside your `views` directory.
* `scripts` is a list of script paths to include in the game client page.
* `stylesheets` is a list of stylesheet paths to include in the game client page.
* `canvasPixelScale` is the number of canvas pixels per measurement of CSS pixel. The default value is 2.
* The default value of `canvasBackgroundColor` is `"#FFFFFF"`.

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
                    "indexed": Boolean (Optional),
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

## Server-Side Usage

This module exposes the following members:

* `ostracodMultiplayer`: Controls high-level server operations.
* `pageUtils`: Contains various functions for serving pages.
* `dbUtils`: Contains various functions for accessing the database.
* `accountUtils`: Contains various functions for processing user accounts.
* `gameUtils`: Controls real-time aspects of gameplay.

Members of `ostracodMultiplayer`:

* `ostracodMultiplayer.shouldListenImmediately`: Whether the server should start listening for HTTP requests upon calling `initializeServer`. The default value is true.
* `ostracodMultiplayer.initializeServer(basePath, gameDelegate, routerList)`: Initializes the server, and starts listening for HTTP requests if `shouldListenImmediately` is true.
    * `basePath` should point to the top level of your project.
    * `gameDelegate` must be your custom implementation of `GameDelegate`.
    * `routerList` is a list of Express routers for additional endpoints.
* `ostracodMultiplayer.listen()`: Causes the server to start listening for HTTP requests.
* `ostracodMultiplayer.mode`: Either `"development"` or `"production"`.

Members of `pageUtils`:

* `pageUtils.renderPage(res, path, options, parameters)`: Renders the page at `path` with given parameters using Mustache.
    * `path` must be fully resolved.
    * `options` may contain any of the following members:
        * `scripts`: List of client-side script paths.
        * `stylesheets`: List of client-side stylesheet paths.
        * `shouldDisplayTitle`
        * `contentWidth`
* `pageUtils.isAuthenticated(req)`: Returns whether the user is logged in based on the given request.
* `pageUtils.getUsername(req)`: Returns the username of the logged-in user based on the given request.
* `pageUtils.errorOutput`: Enumeration containing `JSON_ERROR_OUTPUT`, `PAGE_ERROR_OUTPUT`, and `SOCKET_ERROR_OUTPUT`.
* `pageUtils.checkAuthentication(errorOutput)`: Prevents a user from accessing a page if they are not logged in.

Members of `dbUtils`:

* `dbUtils.performTransaction(operation, done?)`: Performs the operation with a lock on the database.
* `dbUtils.performQuery(query, parameterList, done?)`: Performs a single query on the database. Will not work outside of `performTransaction`.

Members of `accountUtils`:

* `accountUtils.getAccountByUsername(username, done?)`: Retrieves a user by username. Must be performed in a DB transaction.
* `accountUtils.updateAccount(uid, valueSet, done?)`: Modifies fields in a user account. Must be performed in a DB transaction.
* `accountUtils.removeAccount(uid, done?)`: Removes a user account. Must be performed in a DB transaction.

Members of `gameUtils`:

* `gameUtils.isPersistingEverything`: Indicates whether server state is being saved to non-volatile storage.
* `gameUtils.playerList`: List of players in the game and non-persisted players.
* `gameUtils.performAtomicOperation(operation, done?)`: Perform `operation` so that it does not happen at the same time as another atomic `gameUtils` operation.
    * `operation` accepts a single argument `(done?)`.
    * `done` accepts a single optional argument `(errorMessage)`.
* `gameUtils.announceMessageInChat(text)`: Send a message to all players.
* `gameUtils.getPlayerByUsername(username, includeStale)`: Retrieves a player. If `includeStale` is true, output includes players which have left the game.
* `gameUtils.addCommandListener(commandName, isSynchronous, operation)`: Perform an atomic operation if the client sends a particular command.
    * If synchronous, `operation` accepts the arguments `(command, player, commandList)`.
    * If asynchronous, `operation` accepts the arguments `(command, player, commandList, done?, errorHandler?)`.
        * `errorHandler` accepts a single argument `(message)`.
    * In both cases, `command` is the incoming command, `player` is the client player, and `commandList` is a list of response commands.

Members of `Player`:

* `player.username`
* `player.score`
* `player.hasLeftGame`
* `player.extraFields`: Dictionary of extra fields defined in your database schema. These will be persisted automatically.

Your project must create a `GameDelegate` and pass it into `ostracodMultiplayer.initialize`. `GameDelegate` must have the following members:

* `gameDelegate.playerEnterEvent(player)`: Called whenever a player enters the game.
* `gameDelegate.playerLeaveEvent(player)`: Called whenever a player leaves the game.
* `gameDelegate.persistEvent(done?)`: Called immediately before the server persists game state. Performed within an atomic `gameUtils` operation.
* `gameDelegate.getOnlinePlayerText(player)` (Optional): Determines the line of text to display for each online player.

To run your project for development, perform this command:

```
NODE_ENV=development node (Your Script)
```

In the development environment, various security features are deactivated to facilitate testing. Do NOT use the development environment on a production server!

For a production environment, perform something like this:

```
NODE_ENV=production nohup node (Your Script) > serverMessages.txt 2>&1 &
```

## Client-Side Usage

The global scope in the game page exposes the following members:

* `Pos`: Represents a 2D position.
* `createPosFromJson(data)`: Converts JSON data to a `Pos`.
* `Color`: Represents an RGB color.
* `canvas` and `context`: For rendering graphics.
* `canvasWidth` and `canvasHeight`: Canvas dimensions as defined in your config file.
* `canvasPixelScale`: Scaling factor for pixels as defined in your config file.
* `canvasBackgroundColor`: Color string as defined in your config file.
* `framesPerSecond`: FPS as defined in your config file.
* `shiftKeyIsHeld`: Whether the user is pressing the shift key.
* `canvasMouseIsHeld`: Whether the user is holding the mouse button after clicking on the canvas.
* `gameUpdateCommandList`: List of commands to send to the server.
* `focusedTextInput`: HTML tag of focused text input.
* `clientDelegate`: You must assign a value to this in your script.
* `addCommandListener(commandName, operation)`: Perform an operation whenever the client receives a server command. `operation` accepts a single `(command)` argument.
* `addCommandRepeater(commandName, operation)`: Invoked for any unsent commands after receiving server commands. `operation` accepts a single `(command)` argument.
* `updateCanvasSize()`: Must be invoked after changing `canvasWidth`, `canvasHeight`, or `canvasPixelScale`.
* `clearCanvas()`: Erases contents of the canvas using `canvasBackgroundColor`.
* `getModuleByName(name)`: Retrieves the `Module` with the given name.
* `showModuleByName(name)`: Opens the page module with the given name.
* `hideModuleByName(name)`: Closes the page module with the given name.

Members of `Pos`:

* `new Pos(x, y)`
* `pos.x` and `pos.y`
* `pos.set(pos)`
* `pos.add(pos)`
* `pos.subtract(pos)`
* `pos.scale(number)`
* `pos.copy()`
* `pos.equals(pos)`
* `pos.getDistance(pos)`
* `pos.toString()`
* `pos.toJson()`

Members of `Color`:

* `new Color(r, g, b)`
* `color.r`, `color.g`, and `color.b`
* `color.copy()`
* `color.scale(number)`
* `color.equals(color)`
* `color.toString()`

Members of `Module`:

* `module.name` and `module.isVisible`
* `module.show()`
* `module.hide()`

Your client script must create a `ClientDelegate` and assign it to the global variable `clientDelegate`. `ClientDelegate` must have the following members:

* `clientDelegate.initialize(done?)`: Called after the page is loaded, and before registering event listeners.
* `clientDelegate.setLocalPlayerInfo(command)`: Called after the client receives local player information. `command` contains the members `username`, `score`, and `extraFields`.
* `clientDelegate.addCommandsBeforeUpdateRequest()`: Called before sending each bundle of commands through the web socket.
* `clientDelegate.timerEvent()`: Called for each client frame.
* `clientDelegate.keyDownEvent(keyCode)`: Called whenever the user presses a key. Return false to override default browser action, and true otherwise.
* `clientDelegate.keyUpEvent(keyCode)`: Called whenever the user releases a key. Return false to override default browser action, and true otherwise.
* `clientDelegate.moduleShowEvent(name)` (Optional): Called whenever a page module is opened.
* `clientDelegate.moduleHideEvent(name)` (Optional): Called whenever a page module is closed.
* `clientDelegate.canvasMouseMoveEvent(pos)` (Optional): Called whenever the user moves the mouse within the canvas.
* `clientDelegate.canvasMouseDownEvent(pos)` (Optional): Called whenever the user presses the the mouse button down inside the canvas.
* `clientDelegate.canvasMouseLeaveEvent()` (Optional): Called whenever the user moves the mouse outside of the canvas.
* `clientDelegate.mouseUpEvent()` (Optional): Called whenever the user releases the mouse button anywhere on the page.


