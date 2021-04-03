
const express = require("express");
const { ostracodMultiplayer, gameUtils, pageUtils } = require("ostracod-multiplayer");

const { checkAuthentication } = pageUtils;
const { PAGE_ERROR_OUTPUT } = pageUtils.errorOutput;

class GameDelegate {
    
    // Called whenever a player enters the game.
    playerEnterEvent(player) {
        if (player.extraFields.inspiration === null) {
            player.extraFields.inspiration = 0;
        }
        console.log(player.username + " entered!");
    }
    
    // Called whenever a player leaves the game.
    playerLeaveEvent(player) {
        console.log(player.username + " left!");
    }
    
    // Called whenever the server is persisting server state.
    persistEvent(done) {
        console.log("Persist event!");
        done();
    }
}

const gameDelegate = new GameDelegate();

// Define how to communicate the player's score to the client.
const addSetScoreCommand = (player, commandList) => {
    commandList.push({
        commandName: "setScore",
        score: player.score,
    });
};

// Define how to communicate the player's inspiration to the client.
const addSetInspirationCommand = (player, commandList) => {
    commandList.push({
        commandName: "setInspiration",
        inspiration: player.extraFields.inspiration,
    });
};

// Define how to process the "earnPoints" command.
gameUtils.addCommandListener(
    "earnPoints", // Command name for the operation.
    true, // Perform operation synchronously.
    (command, player, commandList) => {
        player.score += command.pointAmount;
        addSetScoreCommand(player, commandList);
    },
);

// Define how to process the "getInspiration" command.
gameUtils.addCommandListener(
    "getInspiration", // Command name for the operation.
    true, // Perform operation synchronously.
    (command, player, commandList) => {
        addSetInspirationCommand(player, commandList);
    },
);

// Define how to process the "asynchronousOperation" command.
gameUtils.addCommandListener(
    "asynchronousOperation", // Command name for the operation.
    false, // Perform operation asynchronously.
    (command, player, commandList, done, errorHandler) => {
        setTimeout(done, 100);
    },
);

// Add a custom timer event.
const timerEvent = () => {
    if (gameUtils.isPersistingEverything) {
        return;
    }
    for (const player of gameUtils.playerList) {
        player.extraFields.inspiration += 1;
    }
};

setInterval(timerEvent, 1000);

// Set up some extra server endpoints.
const router = express.Router();

router.get("/testOne", (req, res, next) => {
    pageUtils.renderPage(
        res,
        pageUtils.getConsumerViewPath("test.html"),
        {},
        { message: "Anyone can view this page!" },
    );
});

router.get("/testTwo", checkAuthentication(PAGE_ERROR_OUTPUT), (req, res, next) => {
    pageUtils.renderPage(
        res,
        pageUtils.getConsumerViewPath("test.html"),
        {},
        { message: "Your username is " + pageUtils.getUsername(req) + "!" },
    );
});

console.log("Starting OstracodMultiplayer...");

const tempResult = ostracodMultiplayer.initializeServer(__dirname, gameDelegate, [router]);

if (!tempResult) {
    process.exit(1);
}


