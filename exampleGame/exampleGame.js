
var express = require("express");
var tempResource = require("ostracod-multiplayer");
var ostracodMultiplayer = tempResource.ostracodMultiplayer;
var gameUtils = tempResource.gameUtils;
var pageUtils = tempResource.pageUtils;

var checkAuthentication = pageUtils.checkAuthentication;
var PAGE_ERROR_OUTPUT = pageUtils.errorOutput.PAGE_ERROR_OUTPUT;

function GameDelegate() {
    
}

var gameDelegate = new GameDelegate();

// Called whenever a player enters the game.
GameDelegate.prototype.playerEnterEvent = function(player) {
    if (player.extraFields.inspiration === null) {
        player.extraFields.inspiration = 0;
    }
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

// Define how to communicate the player's inspiration to the client.
function addSetInspirationCommand(player, commandList) {
    commandList.push({
        commandName: "setInspiration",
        inspiration: player.extraFields.inspiration
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

// Define how to process the "getInspiration" command.
gameUtils.addCommandListener(
    "getInspiration", // Command name for the operation.
    true, // Perform operation synchronously.
    function(command, player, commandList) {
        addSetInspirationCommand(player, commandList);
    }
);

// Add a custom timer event.
function timerEvent() {
    if (gameUtils.isPersistingEverything) {
        return;
    }
    var index = 0;
    while (index < gameUtils.playerList.length) {
        var tempPlayer = gameUtils.playerList[index];
        tempPlayer.extraFields.inspiration += 1;
        index += 1;
    }
}

setInterval(timerEvent, 1000);

// Set up some extra server endpoints.
var router = express.Router();

router.get("/testOne", function(req, res, next) {
    pageUtils.renderPage(
        res,
        pageUtils.getConsumerViewPath("test.html"),
        {},
        {message: "Anyone can view this page!"}
    );
});

router.get("/testTwo", checkAuthentication(PAGE_ERROR_OUTPUT), function(req, res, next) {
    pageUtils.renderPage(
        res,
        pageUtils.getConsumerViewPath("test.html"),
        {},
        {message: "Your username is " + pageUtils.getUsername(req) + "!"}
    );
});

console.log("Starting OstracodMultiplayer...");

var tempResult = ostracodMultiplayer.initializeServer(__dirname, gameDelegate, [router]);

if (!tempResult) {
    process.exit(1);
}


