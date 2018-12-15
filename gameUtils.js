
var ostracodMultiplayer = require("./ostracodMultiplayer").ostracodMultiplayer;
var dbUtils = require("./dbUtils").dbUtils;
var accountUtils = require("./accountUtils").accountUtils;

function GameUtils() {
    this.framesPerSecond = 10;
    this.hasStopped = false;
    this.maximumPlayerCount = 15; // TODO: This should be configurable.
    this.persistDelay = 60 * this.framesPerSecond;
    this.isPersistingEverything = false;
    this.chatMessageList = [];
    this.nextChatMessageId = 0;
    this.playerList = [];
}

var gameUtils = new GameUtils();

module.exports = {
    gameUtils: gameUtils
};

function ChatMessage(id, username, text) {
    this.id = id;
    this.username = username;
    this.text = text;
    this.time = Date.now() / 1000;
}

function Player(account) {
    this.accountUid = account.uid;
    this.username = account.username;
    this.score = account.score;
    this.lastActivityTime = Date.now() / 1000;
    this.lastChatMessageId = gameUtils.nextChatMessageId - 10;
    gameUtils.announceMessageInChat(this.username + " has joined the game.");
}

Player.prototype.persist = function(done) {
    var self = this;
    dbUtils.performTransaction(function(callback) {
        accountUtils.updateAccount(
            self.accountUid,
            {score: self.score}, 
            function(error, result) {
                if (error) {
                    console.log(error);
                    return;
                }
                callback();
            }
        );
    }, done);
}

GameUtils.prototype.addChatMessage = function(username, text) {
    var tempId = this.nextChatMessageId;
    this.nextChatMessageId += 1;
    var tempMessage = new ChatMessage(tempId, username, text);
    this.chatMessageList.push(tempMessage);
    while (this.chatMessageList.length > 100) {
        this.chatMessageList.shift();
    }
}

GameUtils.prototype.announceMessageInChat = function(text) {
    this.addChatMessage(null, text);
}

GameUtils.prototype.getPlayerByUsername = function(username) {
    var index = 0;
    while (index < this.playerList.length) {
        var tempPlayer = this.playerList[index];
        if (tempPlayer.username == username) {
            return tempPlayer;
        }
        index += 1;
    }
    return null;
}

GameUtils.prototype.performUpdate = function(username, commandList, done) {
    function errorHandler(message) {
        done({
            success: false,
            message: message
        });
    }
    if (this.hasStopped) {
        errorHandler("The server is scheduled to shut down. Please come back later.");
        return;
    }
    var tempPlayer;
    var tempCommandList;
    var index = 0;
    function startProcessingCommands() {
        tempPlayer.lastActivityTime = Date.now() / 1000;
        tempCommandList = [];
        index = 0;
        processNextCommand();
    }
    var self = this;
    function processNextCommand() {
        if (self.isPersistingEverything) {
            setTimeout(processNextCommand, 100);
            return;
        }
        while (true) {
            if (index >= commandList.length) {
                done({
                    success: true,
                    commandList: tempCommandList
                });
                return;
            }
            var tempCommand = commandList[index];
            index += 1;
            // TODO: Rework this.
            if (tempCommand.commandName == "startPlaying") {
                performStartPlayingCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "addChatMessage") {
                performAddChatMessageCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "getChatMessages") {
                performGetChatMessagesCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "getOnlinePlayers") {
                performGetOnlinePlayersCommand(tempCommand, tempPlayer, tempCommandList);
            }
        }
    }
    var tempErrorMessage = null;
    tempPlayer = gameUtils.getPlayerByUsername(username);
    if (tempPlayer === null) {
        if (this.playerList.length >= this.maximumPlayerCount) {
            errorHandler("The server has reached maximum player capacity. Please come back later.");
            return;
        }
        dbUtils.performTransaction(
            function(callback) {
                accountUtils.getAccountByUsername(username, function(error, result) {
                    if (error) {
                        console.log(error);
                        tempErrorMessage = "There was a database error. Please try again later.";
                        return;
                    }
                    tempPlayer = new Player(result);
                    self.playerList.push(tempPlayer);
                    callback();
                });
            }, function() {
                if (tempErrorMessage !== null) {
                    errorHandler(tempErrorMessage);
                    return;
                }
                startProcessingCommands();
            }
        );
    } else {
        startProcessingCommands();
    }
}

function addSetLocalPlayerInfoCommand(player, commandList) {
    commandList.push({
        commandName: "setLocalPlayerInfo",
        username: player.username,
        score: player.score
    });
}

function addAddChatMessageCommand(chatMessage, commandList) {
    commandList.push({
        commandName: "addChatMessage",
        username: chatMessage.username,
        text: chatMessage.text
    });
}

function addRemoveAllOnlinePlayersCommand(commandList) {
    commandList.push({
        commandName: "removeAllOnlinePlayers"
    });
}

function addAddOnlinePlayerCommand(player, commandList) {
    commandList.push({
        commandName: "addOnlinePlayer",
        username: player.username,
        score: player.score
    });
}

function performStartPlayingCommand(command, player, commandList) {
    addSetLocalPlayerInfoCommand(player, commandList);
}

function performAddChatMessageCommand(command, player, commandList) {
    gameUtils.addChatMessage(player.username, command.text);
}

function performGetChatMessagesCommand(command, player, commandList) {
    var tempHighestId = -1;
    var index = 0;
    while (index < gameUtils.chatMessageList.length) {
        var tempChatMessage = gameUtils.chatMessageList[index];
        if (tempChatMessage.id > player.lastChatMessageId) {
            addAddChatMessageCommand(tempChatMessage, commandList);
        }
        if (tempChatMessage.id > tempHighestId) {
            tempHighestId = tempChatMessage.id;
        }
        index += 1;
    }
    player.lastChatMessageId = tempHighestId;
}

function performGetOnlinePlayersCommand(command, player, commandList) {
    addRemoveAllOnlinePlayersCommand(commandList);
    var index = 0;
    while (index < gameUtils.playerList.length) {
        var tempPlayer = gameUtils.playerList[index];
        addAddOnlinePlayerCommand(tempPlayer, commandList);
        index += 1;
    }
}

GameUtils.prototype.persistEverything = function(done) {
    if (this.isPersistingEverything) {
        done();
        return;
    }
    if (ostracodMultiplayer.mode == "development") {
        console.log("Saving world state...");
    }
    this.isPersistingEverything = true;
    var self = this;
    var index = 0;
    function persistNextPlayer() {
        while (true) {
            if (index >= self.playerList.length) {
                self.isPersistingEverything = false;
                if (ostracodMultiplayer.mode == "development") {
                    console.log("Saved world state.");
                }
                done();
                return;
            }
            var tempPlayer = self.playerList[index];
            index += 1;
            tempPlayer.persist(persistNextPlayer);
        }
    }
    persistNextPlayer();
}

function exitEvent() {
    gameUtils.persistEverything(function() {
        process.exit();
    })
}

process.on("SIGINT", exitEvent);
process.on("SIGUSR1", exitEvent);
process.on("SIGUSR2", exitEvent);

GameUtils.prototype.stopGame = function(done) {
    this.hasStopped = true;
    this.persistEverything(done);
}

GameUtils.prototype.gameTimerEvent = function() {
    if (this.hasStopped || this.isPersistingEverything) {
        return;
    }
    
    this.persistDelay -= 1;
    if (this.persistDelay <= 0) {
        this.persistDelay = 60 * this.framesPerSecond;
        gameUtils.persistEverything(function() {
            // Do nothing.
        });
    }
}

setInterval(function() {
    gameUtils.gameTimerEvent();
}, 1000 / gameUtils.framesPerSecond);


