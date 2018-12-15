
var canvas;
var context;
// TODO: Custom dimensions and frames per second.
var canvasWidth = 600;
var canvasHeight = 600;
var framesPerSecond = 25;
var shiftKeyIsHeld = false;
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
            if (tempCommand.commandName == "addChatMessage") {
                performAddChatMessageCommand(tempCommand);
            }
            if (tempCommand.commandName == "removeAllOnlinePlayers") {
                performRemoveAllOnlinePlayersCommand(tempCommand);
            }
            if (tempCommand.commandName == "addOnlinePlayer") {
                performAddOnlinePlayerCommand(tempCommand);
            }
            // TODO: Custom command actions.
            
            index += 1;
        }
        // Repeat unprocessed client-side commands.
        var index = 0;
        while (index < gameUpdateCommandList.length) {
            var tempCommand = gameUpdateCommandList[index];
            // TODO: Custom command actions.
            
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

function performAddChatMessageCommand(command) {
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
}

function performRemoveAllOnlinePlayersCommand(command) {
    var tempTag = document.getElementById("onlinePlayersDiv");
    tempTag.innerHTML = "";
}

function performAddOnlinePlayerCommand(command) {
    var tempTag = document.getElementById("onlinePlayersDiv");
    tempTag.innerHTML += "<strong>" + encodeHtmlEntity(command.username) + " (" + command.score + ")</strong><br />";
}

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
}

Module.prototype.hide = function() {
    this.isVisible = false;
    this.tag.style.display = "none";
    this.updateButtonClass();
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
    context.fillStyle = "#FFFFFF";
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
            overlayChatInput.style.display = "none";
            overlayChatInputIsVisible = false;
            overlayChatInput.blur();
        }
    } else if (focusedTextInput === null) {
        if (keyCode == 13) {
            document.getElementById("overlayChat").style.display = "block";
            overlayChatInput.style.display = "block";
            overlayChatInputIsVisible = true;
            overlayChatInput.focus();
        }
    }
    // TODO: Custom key bindings.
    
}

function baseKeyUpEvent(event) {
    lastActivityTime = 0;
    var keyCode = event.which;
    if (keyCode == 16) {
        shiftKeyIsHeld = false;
    }
    // TODO: Custom key bindings.
    
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
            performGameUpdateRequest();
        }
    }
    
    // TODO: Custom timer actions.
    
}

function baseInitializeGame() {
    
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = canvasWidth / 2;
    canvas.style.height = canvasHeight / 2;
    canvas.style.border = "3px #000000 solid";
    
    canvas.onclick = function(event) {
        overlayChatInput.style.display = "none";
        overlayChatInputIsVisible = false;
    }
    
    chatInput = document.getElementById("chatInput");
    chatOutput = document.getElementById("chatOutput");
    overlayChatInput = document.getElementById("overlayChatInput");
    overlayChatOutput = document.getElementById("overlayChatOutput");
    
    window.onkeydown = baseKeyDownEvent;
    window.onkeyup = baseKeyUpEvent;
    
    addStartPlayingCommand();
    
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
    
    // TODO: Custom initialization.
    
}

