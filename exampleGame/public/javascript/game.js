
var localPlayerScore;
var localPlayerInspiration;

function displayLocalPlayerScore() {
    document.getElementById("score").innerHTML = localPlayerScore;
}

function displayLocalPlayerInspiration() {
    document.getElementById("inspiration").innerHTML = localPlayerInspiration;
}

// Define how to communicate when the player earns points.
function addEarnPointsCommand() {
    gameUpdateCommandList.push({
        commandName: "earnPoints",
        pointAmount: 5
    });
}

// Define how to request inspiration.
function addGetInspirationCommand() {
    gameUpdateCommandList.push({
        commandName: "getInspiration"
    });
}

// Define how to perform an asynchronous operation.
function addAsynchronousOperationCommand() {
    gameUpdateCommandList.push({
        commandName: "asynchronousOperation"
    });
}

// Define how to process the "setScore" command.
addCommandListener("setScore", function(command) {
    localPlayerScore = command.score;
    displayLocalPlayerScore();
});

// Define how to process the "setInspiration" command.
addCommandListener("setInspiration", function(command) {
    localPlayerInspiration = command.inspiration;
    displayLocalPlayerInspiration();
});

function ClientDelegate() {
    
}

// Called after the page loads.
ClientDelegate.prototype.initialize = function(done) {
    setTimeout(function() {
        console.log("Initialized!");
        done();
    }, 2 * 1000);
}

// Called after the client receives information about the local player.
ClientDelegate.prototype.setLocalPlayerInfo = function(command) {
    localPlayerScore = command.score;
    displayLocalPlayerScore();
}

// Called once before every socket communication.
ClientDelegate.prototype.addCommandsBeforeUpdateRequest = function() {
    // This is a good place to add commands which must happen very often.
    addAsynchronousOperationCommand();
    addGetInspirationCommand();
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


