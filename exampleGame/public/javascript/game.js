
var localPlayerScore;

function displayLocalPlayerScore() {
    document.getElementById("score").innerHTML = localPlayerScore;
}

// Define how to communicate when the player earns points.
function addEarnPointsCommand() {
    gameUpdateCommandList.push({
        commandName: "earnPoints",
        pointAmount: 5
    });
}

// Define how to process the "setScore" command.
addCommandListener("setScore", function(command) {
    localPlayerScore = command.score;
    displayLocalPlayerScore();
});

function ClientDelegate() {
    
}

// Called after the page loads.
ClientDelegate.prototype.initialize = function() {
    console.log("Initialized!");
}

// Called after the client receives information about the local player.
ClientDelegate.prototype.setLocalPlayerInfo = function(command) {
    localPlayerScore = command.score;
    displayLocalPlayerScore();
}

// Called once before every socket communication.
ClientDelegate.prototype.addCommandsBeforeUpdateRequest = function() {
    // This is a good place to add commands which must happen very often.
    
}

// Called on every frame.
ClientDelegate.prototype.timerEvent = function() {
    clearCanvas();
    context.fillStyle = "#0000FF";
    context.fillRect(100 + Math.random() * 50, 100 + Math.random() * 50, 100, 100);
}

// Called when the user presses any key.
ClientDelegate.prototype.keyDownEvent = function(keyCode) {
    // If some text input is focused, ignore keystrokes.
    if (focusedTextInput !== null) {
        return true;
    }
    // Space.
    if (keyCode == 32) {
        addEarnPointsCommand();
        // Override page scrolling.
        return false;
    }
    return true;
}

// Called when the user releases any key.
ClientDelegate.prototype.keyUpEvent = function(keyCode) {
    // You could put something here if you wanted to.
    
    return true;
}

clientDelegate = new ClientDelegate();


