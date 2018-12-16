
var localPlayerScore;

function displayLocalPlayerScore() {
    document.getElementById("score").innerHTML = localPlayerScore;
}

function addEarnPointsCommand() {
    gameUpdateCommandList.push({
        commandName: "earnPoints",
        pointAmount: 5
    });
}

addCommandListener("setScore", function(command) {
    localPlayerScore = command.score;
    displayLocalPlayerScore();
});

function ClientDelegate() {
    
}

ClientDelegate.prototype.initialize = function() {
    console.log("Initialized!");
}

ClientDelegate.prototype.setLocalPlayerInfo = function(command) {
    localPlayerScore = command.score;
    displayLocalPlayerScore();
}

ClientDelegate.prototype.timerEvent = function() {
    clearCanvas();
    context.fillStyle = "#0000FF";
    context.fillRect(100 + Math.random() * 50, 100 + Math.random() * 50, 100, 100);
}

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

ClientDelegate.prototype.keyUpEvent = function(keyCode) {
    // You could put something here if you wanted to.
    
    return true;
}

clientDelegate = new ClientDelegate();


