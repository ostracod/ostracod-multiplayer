
var canvas;
var context;
var canvasPixelScale = 2;
var canvasWidth;
var canvasHeight;
var canvasBackgroundColor;
var canvasBorderWidth = 3;
var framesPerSecond;
var shiftKeyIsHeld = false;
var canvasMouseIsHeld = false;
var chatInput;
var chatOutput;
var chatMessageTagList = [];
var maximumChatMessageCount = 100;
var overlayChatInput;
var overlayChatOutput;
var overlayChatMessageList = [];
var overlayChatInputIsVisible = false;
var gameUpdateCommandList = []
var gameUpdateRequestDelay = 0;
var isRequestingGameUpdate = false;
var hasStopped = false;
var lastActivityTime = 0;
var gameUpdateSocket;
var gameUpdateStartTimestamp;
var moduleList = [];
var focusedTextInput = null;
var commandListenerMap = {};
var commandRepeaterMap = {};
var clientDelegate;

var encodeHtmlEntity = function(text) {
    var tempList = [];
    var index = 0;
    while (index < text.length) {
        tempList.push("&#" + text.charCodeAt(index) + ";");
        index += 1;
    }
    return tempList.join("");
};

function betterModulus(number1, number2) {
    if (number1 >= 0) {
        return number1 % number2;
    } else {
        return (number1 + Math.floor((-number1) / number2 + 1) * number2) % number2; 
    }
}

function addCommandListener(commandName, operation) {
    commandListenerMap[commandName] = operation;
}

function addCommandRepeater(commandName, operation) {
    commandRepeaterMap[commandName] = operation;
}

function performGameUpdateRequest() {
    isRequestingGameUpdate = true;
    gameUpdateStartTimestamp = Date.now() / 1000;
    gameUpdateSocket.send(JSON.stringify(gameUpdateCommandList));
    gameUpdateCommandList = [];
}

function handleGameUpdateRequest(data) {
    var tempTimestamp = Date.now() / 1000;
    document.getElementById("pingTime").innerHTML = Math.floor((tempTimestamp - gameUpdateStartTimestamp) * 1000);
    if (data.success) {
        var tempCommandList = data.commandList;
        var index = 0;
        while (index < tempCommandList.length) {
            var tempCommand = tempCommandList[index];
            var tempOperation = commandListenerMap[tempCommand.commandName];
            if (typeof tempOperation === "undefined") {
                console.log("ERROR: Unknown listener command \"" + tempCommand.commandName + "\".");
            } else {
                tempOperation(tempCommand);
            }
            index += 1;
        }
        // Repeat unprocessed client-side commands.
        var index = 0;
        while (index < gameUpdateCommandList.length) {
            var tempCommand = gameUpdateCommandList[index];
            var tempOperation = commandRepeaterMap[tempCommand.commandName];
            if (typeof tempOperation !== "undefined") {
                tempOperation(tempCommand);
            }
            index += 1;
        }
    } else {
        alert(data.message);
        hasStopped = true;
        window.location = "menu";
    }
    //gameUpdateRequestDelay = 0.25 * framesPerSecond;
    gameUpdateRequestDelay = 0;
    isRequestingGameUpdate = false;
}

function addStartPlayingCommand() {
    gameUpdateCommandList.push({
        commandName: "startPlaying"
    });
}

function addAddChatMessageCommand(text) {
    gameUpdateCommandList.push({
        commandName: "addChatMessage",
        text: text
    });
}

function addGetChatMessagesCommand() {
    gameUpdateCommandList.push({
        commandName: "getChatMessages"
    });
}

function addGetOnlinePlayersCommand() {
    gameUpdateCommandList.push({
        commandName: "getOnlinePlayers"
    });
}

addCommandListener("setLocalPlayerInfo", function(command) {
    clientDelegate.setLocalPlayerInfo(command);
});

addCommandListener("addChatMessage", function(command) {
    var tempPlayerName;
    if (command.username === null) {
        tempPlayerName = null;
    } else {
        tempPlayerName = encodeHtmlEntity(command.username);
    }
    var tempText = encodeHtmlEntity(command.text);
    var tempIsAtBottom = (chatOutput.scrollTop + 150 > chatOutput.scrollHeight - 30);
    var tempTag = document.createElement("div");
    if (tempPlayerName === null) {
        tempTag.innerHTML = tempText;
    } else {
        tempTag.innerHTML = "<strong>" + tempPlayerName + ":</strong> " + tempText;
    }
    chatOutput.appendChild(tempTag);
    chatMessageTagList.push(tempTag);
    while (chatMessageTagList.length > maximumChatMessageCount) {
        var tempTag = chatMessageTagList[0];
        chatOutput.removeChild(tempTag);
        chatMessageTagList.splice(0, 1);
    }
    if (tempIsAtBottom) {
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }
    new OverlayChatMessage(tempPlayerName, tempText);
});

addCommandListener("setOnlinePlayers", function(command) {
    var tempTag = document.getElementById("onlinePlayersDiv");
    var tempContentList = [];
    var index = 0;
    while (index < command.lines.length) {
        var tempLine = command.lines[index];
        tempContentList.push("<strong>" + encodeHtmlEntity(tempLine) + "</strong><br />");
        index += 1;
    }
    tempTag.innerHTML = tempContentList.join("");
});

function OverlayChatMessage(playerName, text) {
    this.tag = document.createElement("div");
    if (playerName === null) {
        this.tag.innerHTML = text;
    } else {
        this.tag.innerHTML = "<strong>" + playerName + ":</strong> " + text;
    }
    overlayChatOutput.appendChild(this.tag);
    this.delay = 8 * framesPerSecond;
    overlayChatMessageList.push(this);
    while (overlayChatMessageList.length > 3) {
        var tempMessage = overlayChatMessageList[0];
        tempMessage.removeTag();
        overlayChatMessageList.splice(0, 1);
    }
}

OverlayChatMessage.prototype.removeTag = function() {
    overlayChatOutput.removeChild(this.tag);
}

OverlayChatMessage.prototype.getIsVisible = function() {
    var tempValue = document.getElementById("showOverlay").checked
    return ((this.delay > 0 && tempValue) || focusedTextInput == overlayChatInput);
}

OverlayChatMessage.prototype.tick = function() {
    if (focusedTextInput == overlayChatInput) {
        this.tag.style.color = "#FFFFFF";
        this.tag.style.display = "block";
    } else {
        var tempFadeDelay = 2 * framesPerSecond;
        if (this.delay < tempFadeDelay) {
            var tempColorValue = Math.floor(255 * this.delay / tempFadeDelay);
            this.tag.style.color = "rgb(" + tempColorValue + ", " + tempColorValue + ", " + tempColorValue + ")";
        } else {
            this.tag.style.color = "#FFFFFF";
        }
        if (this.delay <= 0) {
            this.tag.style.display = "none";
        } else {
            this.tag.style.display = "block";
            this.delay -= 1;
        }
    }
}

function Module(name) {
    this.name = name;
    this.tag = document.getElementById(name + "Module");
    this.buttonTag = document.getElementById(name + "Button");
    this.isVisible = false;
    this.hide();
    moduleList.push(this);
}

Module.prototype.showOrHide = function() {
    if (this.isVisible) {
        this.hide();
    } else {
        this.show();
    }
}

Module.prototype.updateButtonClass = function() {
    if (this.isVisible) {
        this.buttonTag.className = "moduleButtonOpen";
    } else {
        this.buttonTag.className = "moduleButton";
    }
}

Module.prototype.show = function() {
    this.isVisible = true;
    this.tag.style.display = "block";
    this.updateButtonClass();
    if ("moduleShowEvent" in clientDelegate) {
        clientDelegate.moduleShowEvent(this.name);
    }
}

Module.prototype.hide = function() {
    this.isVisible = false;
    this.tag.style.display = "none";
    this.updateButtonClass();
    if ("moduleHideEvent" in clientDelegate) {
        clientDelegate.moduleHideEvent(this.name);
    }
}

function getModuleByName(name) {
    var index = 0;
    while (index < moduleList.length) {
        var tempModule = moduleList[index];
        if (tempModule.name == name) {
            return tempModule;
        }
        index += 1;
    }
    return null;
}

function showOrHideModuleByName(name) {
    var tempModule = getModuleByName(name);
    tempModule.showOrHide();
}

function showModuleByName(name) {
    var tempModule = getModuleByName(name);
    tempModule.show();
}

function hideModuleByName(name) {
    var tempModule = getModuleByName(name);
    tempModule.hide();
}

function clearCanvas() {
    context.fillStyle = canvasBackgroundColor;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
}

function configureTextInputFocusHandlers(tag) {
    tag.onfocus = function() {
        focusedTextInput = tag;
    }
    tag.onblur = function() {
        if (focusedTextInput == tag) {
            focusedTextInput = null;
        }
    }
}

function showOverlayChatInput() {
    document.getElementById("overlayChat").style.display = "block";
    overlayChatInput.style.display = "block";
    overlayChatInputIsVisible = true;
    overlayChatInput.focus();
}

function hideOverlayChatInput() {
    overlayChatInput.style.display = "none";
    overlayChatInputIsVisible = false;
    overlayChatInput.blur();
}

function baseKeyDownEvent(event) {
    lastActivityTime = 0;
    var keyCode = event.which;
    if (keyCode == 16) {
        shiftKeyIsHeld = true;
    }
    if (focusedTextInput == chatInput) {
        if (keyCode == 13) {
            var tempText = chatInput.value;
            if (tempText.length > 0) {
                addAddChatMessageCommand(tempText);
                chatInput.value = "";
            }
        }
    } else if (focusedTextInput == overlayChatInput) {
        if (keyCode == 13) {
            var tempText = overlayChatInput.value;
            if (tempText.length > 0) {
                addAddChatMessageCommand(tempText);
                overlayChatInput.value = "";
            }
            hideOverlayChatInput();
        }
    } else if (focusedTextInput === null) {
        if (keyCode == 13) {
            showOverlayChatInput();
        }
    }
    return clientDelegate.keyDownEvent(keyCode);
}

function baseKeyUpEvent(event) {
    lastActivityTime = 0;
    var keyCode = event.which;
    if (keyCode == 16) {
        shiftKeyIsHeld = false;
    }
    return clientDelegate.keyUpEvent(keyCode);
}

function baseTimerEvent() {
    
    if (hasStopped) {
        return;
    }
    
    var tempTag = document.getElementById("overlayChat");
    var tempHasFoundVisibleMessage = false;
    var index = 0;
    while (index < overlayChatMessageList.length) {
        var tempMessage = overlayChatMessageList[index];
        if (tempMessage.getIsVisible()) {
            tempHasFoundVisibleMessage = true;
            break;
        }
        index += 1;
    }
    if (tempHasFoundVisibleMessage || overlayChatInputIsVisible) {
        tempTag.style.display = "block";
    } else {
        tempTag.style.display = "none";
    }
    
    var index = overlayChatMessageList.length - 1;
    while (index >= 0) {
        var tempMessage = overlayChatMessageList[index];
        tempMessage.tick();
        index -= 1;
    }
    
    lastActivityTime += 1;
    if (lastActivityTime > 10 * 60 * framesPerSecond) {
        alert("You have been kicked due to inactivity.");
        hasStopped = true;
        window.location = "menu";
    }
    
    if (isRequestingGameUpdate) {
        var tempDelay = (Date.now() / 1000) - gameUpdateStartTimestamp;
        if (tempDelay > 15) {
            alert("Lost connection to the server.");
            hasStopped = true;
            window.location = "menu";
        }
    } else {
        gameUpdateRequestDelay -= 1;
        if (gameUpdateRequestDelay <= 0) {
            addGetChatMessagesCommand();
            addGetOnlinePlayersCommand();
            clientDelegate.addCommandsBeforeUpdateRequest();
            performGameUpdateRequest();
        }
    }
    
    clientDelegate.timerEvent();
}

function convertCanvasMouseEventToPos(event) {
    var x = event.offsetX - canvasBorderWidth;
    var y = event.offsetY - canvasBorderWidth;
    if (x < 0 || x >= canvasWidth / canvasPixelScale
            || y < 0 || y >= canvasHeight / canvasPixelScale) {
        return null;
    }
    return new Pos(x, y);
}

function baseCanvasClickEvent() {
    hideOverlayChatInput();
}

function baseCanvasMouseMoveEvent(event) {
    if ("canvasMouseMoveEvent" in clientDelegate) {
        var pos = convertCanvasMouseEventToPos(event);
        if (pos !== null) {
            clientDelegate.canvasMouseMoveEvent(pos);
        }
    }
}

function baseCanvasMouseDownEvent(event) {
    canvasMouseIsHeld = true;
    if ("canvasMouseDownEvent" in clientDelegate) {
        var pos = convertCanvasMouseEventToPos(event);
        if (pos !== null) {
            clientDelegate.canvasMouseDownEvent(pos);
        }
    }
    return false;
}

function baseCanvasMouseLeaveEvent() {
    if ("canvasMouseLeaveEvent" in clientDelegate) {
        clientDelegate.canvasMouseLeaveEvent();
    }
}

function baseMouseUpEvent() {
    canvasMouseIsHeld = false;
    if ("mouseUpEvent" in clientDelegate) {
        clientDelegate.mouseUpEvent();
    }
}

function baseInitializeGameHelper() {
    
    canvas.onclick = baseCanvasClickEvent;
    canvas.onmousemove = baseCanvasMouseMoveEvent;
    canvas.onmousedown = baseCanvasMouseDownEvent;
    canvas.onmouseleave = baseCanvasMouseLeaveEvent;
    document.getElementsByTagName("body")[0].onmouseup = baseMouseUpEvent;
    
    window.onkeydown = baseKeyDownEvent;
    window.onkeyup = baseKeyUpEvent;
    
    var tempProtocol;
    if (window.location.protocol == "http:") {
        tempProtocol = "ws:";
    } else {
        tempProtocol = "wss:";
    }
    var tempAddress = tempProtocol + "//" + window.location.hostname + ":" + window.location.port + "/gameUpdate";
    gameUpdateSocket = new WebSocket(tempAddress);
    gameUpdateSocket.onopen = function(event) {
        setInterval(baseTimerEvent, Math.floor(1000 / framesPerSecond));
    };
    gameUpdateSocket.onmessage = function(event) {
        handleGameUpdateRequest(JSON.parse(event.data));
    };
    
    var tempTagList = document.getElementsByTagName("input");
    var index = 0;
    while (index < tempTagList.length) {
        var tempTag = tempTagList[index];
        if (tempTag.type == "text") {
            configureTextInputFocusHandlers(tempTag);
        }
        index += 1;
    }
    
    addStartPlayingCommand();
}

function baseInitializeGame() {
    
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = canvasWidth / canvasPixelScale;
    canvas.style.height = canvasHeight / canvasPixelScale;
    canvas.style.border = canvasBorderWidth + "px #000000 solid";
    
    context.font = "32px Arial";
    context.fillStyle = "#000000";
    context.fillText("Initializing game...", 30, 60);
    
    chatInput = document.getElementById("chatInput");
    chatOutput = document.getElementById("chatOutput");
    overlayChatInput = document.getElementById("overlayChatInput");
    overlayChatOutput = document.getElementById("overlayChatOutput");
    
    if (clientDelegate.initialize.length <= 0) {
        clientDelegate.initialize();
        baseInitializeGameHelper();
    } else {
        clientDelegate.initialize(baseInitializeGameHelper);
    }
}


