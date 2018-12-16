
var tempResource = require("ostracod-multiplayer");
var ostracodMultiplayer = tempResource.ostracodMultiplayer;
var gameUtils = tempResource.gameUtils;

function GameDelegate() {
    
}

var gameDelegate = new GameDelegate();

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


