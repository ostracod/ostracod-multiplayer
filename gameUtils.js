
const accountDefaultFieldNameSet = [
    "uid", "username", "passwordHash", "emailAddress", "score",
];

class ChatMessage {
    
    constructor(id, username, text) {
        this.id = id;
        this.username = username;
        this.text = text;
        this.time = Date.now() / 1000;
    }
}

class Player {
    
    constructor(account) {
        this.accountUid = account.uid;
        this.username = account.username;
        this.score = account.score;
        this.extraFields = {};
        for (const name in account) {
            if (accountDefaultFieldNameSet.indexOf(name) < 0) {
                this.extraFields[name] = account[name];
            }
        }
        this.lastActivityTime = Date.now() / 1000;
        this.lastChatMessageId = gameUtils.nextChatMessageId - 10;
        this.hasLeftGame = false;
        gameUtils.announceMessageInChat(this.username + " has joined the game.");
    }
    
    tick() {
        if (this.hasLeftGame) {
            return;
        }
        const tempTime = Date.now() / 1000;
        if (tempTime > this.lastActivityTime + 10) {
            this.hasLeftGame = true;
            gameUtils.announceMessageInChat(this.username + " has left the game.");
            gameUtils.gameDelegate.playerLeaveEvent(this);
            return;
        }
    }
    
    persist(done) {
        const tempFieldSet = { score: this.score };
        for (const name in this.extraFields) {
            tempFieldSet[name] = this.extraFields[name];
        }
        dbUtils.performTransaction((callback) => {
            accountUtils.updateAccount(
                this.accountUid,
                tempFieldSet,
                (error) => {
                    if (error) {
                        console.log(error);
                        return;
                    }
                    callback();
                },
            );
        }, done);
    }
}

class CommandListener {
    
    constructor(isSynchronous, operation) {
        this.isSynchronous = isSynchronous;
        this.operation = operation;
    }
}

class GameUtils {
    
    constructor() {
        this.framesPerSecond = 10;
        this.persistPeriod = 60; // Measured in seconds.
        this.hasStopped = false;
        this.maximumPlayerCount = null;
        this.persistDelay = this.persistPeriod * this.framesPerSecond;
        this.isPersistingEverything = false;
        this.chatMessageList = [];
        this.nextChatMessageId = 0;
        this.playerList = [];
        this.commandListenerMap = {};
        this.gameDelegate = null;
        this.isPerformingAtomicOperation = false;
        this.atomicOperationQueue = [];
    }
    
    performNextAtomicOperation() {
        if (this.atomicOperationQueue.length <= 0) {
            this.isPerformingAtomicOperation = false;
            return;
        }
        let tempOperation = this.atomicOperationQueue.shift();
        tempOperation(() => {
            this.performNextAtomicOperation();
        });
    }
    
    performAtomicOperation(operation, done) {
        return niceUtils.performAsyncOperation((callback) => {
            const queueOperation = (callback2) => {
                niceUtils.performAsyncOperation(operation, 1, (error) => {
                    callback2();
                    if (typeof error === "undefined") {
                        error = null;
                    }
                    callback(error);
                });
            };
            this.atomicOperationQueue.push(queueOperation);
            if (!this.isPerformingAtomicOperation) {
                this.isPerformingAtomicOperation = true;
                this.performNextAtomicOperation();
            }
        }, 1, done);
    }
    
    addChatMessage(username, text) {
        const tempId = this.nextChatMessageId;
        this.nextChatMessageId += 1;
        const tempMessage = new ChatMessage(tempId, username, text);
        this.chatMessageList.push(tempMessage);
        while (this.chatMessageList.length > 100) {
            this.chatMessageList.shift();
        }
    }
    
    announceMessageInChat(text) {
        this.addChatMessage(null, text);
    }
    
    getPlayerByUsername(username, includeStale) {
        if (typeof includeStale === "undefined") {
            includeStale = false;
        }
        for (const player of this.playerList) {
            if (player.username === username && (!player.hasLeftGame || includeStale)) {
                return player;
            }
        }
        return null;
    }
    
    addCommandListener(commandName, isSynchronous, operation) {
        this.commandListenerMap[commandName] = new CommandListener(isSynchronous, operation);
    }
    
    performUpdate(username, commandList, done) {
        const errorHandler = (message) => {
            done({ success: false, message });
        };
        if (this.hasStopped) {
            errorHandler("The server is scheduled to shut down. Please come back later.");
            return;
        }
        let tempPlayer;
        let tempCommandList;
        let index = 0;
        const startProcessingCommands = () => {
            tempPlayer.lastActivityTime = Date.now() / 1000;
            tempCommandList = [];
            index = 0;
            processNextCommand();
        };
        const processNextCommand = () => {
            if (index >= commandList.length) {
                done({
                    success: true,
                    commandList: tempCommandList,
                });
                return;
            }
            const tempCommand = commandList[index];
            index += 1;
            const tempCommandListener = this.commandListenerMap[tempCommand.commandName];
            if (typeof tempCommandListener === "undefined") {
                console.log("ERROR: Unknown listener command \"" + tempCommand.commandName + "\".");
                processNextCommand();
                return;
            }
            const listenerOperation = tempCommandListener.operation;
            let tempOperation;
            if (tempCommandListener.isSynchronous) {
                tempOperation = (callback) => {
                    listenerOperation(tempCommand, tempPlayer, tempCommandList);
                    setTimeout(callback, 0);
                };
            } else if (listenerOperation.length > 3) {
                tempOperation = (callback) => {
                    listenerOperation(
                        tempCommand,
                        tempPlayer,
                        tempCommandList,
                        () => {
                            callback(null);
                        },
                        callback,
                    );
                };
            } else {
                tempOperation = (callback) => {
                    listenerOperation(tempCommand, tempPlayer, tempCommandList).then(() => {
                        callback(null);
                    }).catch((error) => {
                        callback(error);
                    });
                };
            }
            this.performAtomicOperation(tempOperation, (error) => {
                if (error === null) {
                    processNextCommand();
                } else {
                    errorHandler(error);
                }
            });
        };
        let tempErrorMessage = null;
        tempPlayer = this.getPlayerByUsername(username, true);
        if (tempPlayer === null) {
            if (this.playerList.length >= this.maximumPlayerCount) {
                errorHandler("The server has reached maximum player capacity. Please come back later.");
                return;
            }
            dbUtils.performTransaction(
                (callback) => {
                    accountUtils.getAccountByUsername(username, (error, result) => {
                        if (error) {
                            console.log(error);
                            tempErrorMessage = "There was a database error. Please try again later.";
                            return;
                        }
                        tempPlayer = new Player(result);
                        this.playerList.push(tempPlayer);
                        this.gameDelegate.playerEnterEvent(tempPlayer);
                        callback();
                    });
                }, () => {
                    if (tempErrorMessage !== null) {
                        errorHandler(tempErrorMessage);
                        return;
                    }
                    startProcessingCommands();
                },
            );
        } else {
            if (tempPlayer.hasLeftGame) {
                tempPlayer.hasLeftGame = false;
                this.gameDelegate.playerEnterEvent(tempPlayer);
            }
            startProcessingCommands();
        }
    }
    
    persistEverythingHelper(done) {
        if (ostracodMultiplayer.mode === "development") {
            console.log("Saving world state...");
        }
        this.isPersistingEverything = true;
        let index;
        const persistAllPlayers = () => {
            index = 0;
            persistNextPlayer();
        };
        const persistNextPlayer = () => {
            if (index >= this.playerList.length) {
                removeStalePlayers();
                return;
            }
            const tempPlayer = this.playerList[index];
            index += 1;
            tempPlayer.persist(persistNextPlayer);
        };
        const removeStalePlayers = () => {
            for (let tempIndex = this.playerList.length - 1; tempIndex >= 0; tempIndex--) {
                const tempPlayer = this.playerList[tempIndex];
                if (tempPlayer.hasLeftGame) {
                    this.playerList.splice(tempIndex, 1);
                }
            }
            this.isPersistingEverything = false;
            if (ostracodMultiplayer.mode === "development") {
                console.log("Saved world state.");
            }
            done();
        };
        niceUtils.performAsyncOperation(this.gameDelegate.persistEvent, 0, persistAllPlayers);
    }
    
    persistEverything(done) {
        this.performAtomicOperation((callback) => {
            this.persistEverythingHelper(callback);
        }, done);
    }
    
    stopGame(done) {
        this.hasStopped = true;
        this.persistEverything(done);
    }
    
    gameTimerEvent() {
        if (this.hasStopped || this.isPersistingEverything) {
            return;
        }
        for (const player of this.playerList) {
            player.tick();
        }
        this.persistDelay -= 1;
        if (this.persistDelay <= 0) {
            this.persistDelay = this.persistPeriod * this.framesPerSecond;
            gameUtils.persistEverything(() => {
                // Do nothing.
            });
        }
    }
    
    initialize() {
        gameUtils.maximumPlayerCount = ostracodMultiplayer.gameConfig.maximumPlayerCount;
        gameUtils.gameDelegate = ostracodMultiplayer.gameDelegate;
        setInterval(() => {
            gameUtils.gameTimerEvent();
        }, 1000 / gameUtils.framesPerSecond);
    }
}

const gameUtils = new GameUtils();

const addSetLocalPlayerInfoCommand = (player, commandList) => {
    commandList.push({
        commandName: "setLocalPlayerInfo",
        username: player.username,
        score: player.score,
        extraFields: player.extraFields,
    });
};

const addAddChatMessageCommand = (chatMessage, commandList) => {
    commandList.push({
        commandName: "addChatMessage",
        username: chatMessage.username,
        text: chatMessage.text,
    });
};

const addSetOnlinePlayersCommand = (playerList, commandList) => {
    const { gameDelegate } = gameUtils;
    const lines = playerList.map((player) => {
        if ("getOnlinePlayerText" in gameDelegate) {
            return gameDelegate.getOnlinePlayerText(player);
        } else {
            return `${player.username} (${player.score})`;
        }
    });
    commandList.push({
        commandName: "setOnlinePlayers",
        lines,
    });
};

gameUtils.addCommandListener(
    "startPlaying",
    true,
    (command, player, commandList) => {
        addSetLocalPlayerInfoCommand(player, commandList);
    },
);


gameUtils.addCommandListener(
    "addChatMessage",
    true,
    (command, player) => {
        gameUtils.addChatMessage(player.username, command.text);
    },
);

gameUtils.addCommandListener(
    "getChatMessages",
    true,
    (command, player, commandList) => {
        let tempHighestId = -1;
        for (const chatMessage of gameUtils.chatMessageList) {
            if (chatMessage.id > player.lastChatMessageId) {
                addAddChatMessageCommand(chatMessage, commandList);
            }
            if (chatMessage.id > tempHighestId) {
                tempHighestId = chatMessage.id;
            }
        }
        player.lastChatMessageId = tempHighestId;
    },
);

gameUtils.addCommandListener(
    "getOnlinePlayers",
    true,
    (command, player, commandList) => {
        const tempPlayerList = [];
        for (const player of gameUtils.playerList) {
            if (!player.hasLeftGame) {
                tempPlayerList.push(player);
            }
        }
        addSetOnlinePlayersCommand(tempPlayerList, commandList);
    },
);

const exitEvent = () => {
    gameUtils.persistEverything(() => {
        process.exit();
    });
};

process.on("SIGINT", exitEvent);
process.on("SIGUSR1", exitEvent);
process.on("SIGUSR2", exitEvent);

module.exports = { gameUtils };

const { niceUtils } = require("./niceUtils");
const { ostracodMultiplayer } = require("./ostracodMultiplayer");
const { dbUtils } = require("./dbUtils");
const { accountUtils } = require("./accountUtils");


