
function ClientDelegate() {
    
}

ClientDelegate.prototype.initialize = function() {
    console.log("Initialized!");
}

ClientDelegate.prototype.timerEvent = function() {
    clearCanvas();
    context.fillStyle = "#0000FF";
    context.fillRect(100 + Math.random() * 50, 100 + Math.random() * 50, 100, 100);
}

ClientDelegate.prototype.keyDownEvent = function(keyCode) {
    console.log("Key pressed! " + keyCode);
    return true;
}

ClientDelegate.prototype.keyUpEvent = function(keyCode) {
    console.log("Key released! " + keyCode);
    return true;
}

clientDelegate = new ClientDelegate();


