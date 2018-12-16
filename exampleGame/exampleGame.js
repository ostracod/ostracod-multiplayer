
var tempResource = require("ostracod-multiplayer");
var ostracodMultiplayer = tempResource.ostracodMultiplayer;
var gameUtils = tempResource.gameUtils;

function GameDelegate() {
    
}

var gameDelegate = new GameDelegate();

// Called whenever a player enters the game.
GameDelegate.prototype.playerEnterEvent = function(player) {
    console.log(player.username + " entered!");
}

// Called whenever a player leaves the game.
GameDelegate.prototype.playerLeaveEvent = function(player) {
    console.log(player.username + " left!");
}

// Called whenever the server is persisting server state.
GameDelegate.prototype.persistEvent = function(done) {
    console.log("Persist event!");
    done();
}

// Define how to communicate the player's score to the client.
function addSetScoreCommand(player, commandList) {
    commandList.push({
        commandName: "setScore",
        score: player.score
    });
}

// Define how to process the "earnPoints" command.
gameUtils.addCommandListener(
    "earnPoints", // Command name for the operation.
    true, // Perform operation synchronously.
    function(command, player, commandList) {
        player.score += command.pointAmount;
        addSetScoreCommand(player, commandList);
    }
);

console.log("Starting OstracodMultiplayer...");

var tempResult = ostracodMultiplayer.initializeServer(__dirname, gameDelegate);

if (!tempResult) {
    process.exit(1);
}


