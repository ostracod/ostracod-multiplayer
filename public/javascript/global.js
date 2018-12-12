
var classParentMap = {};

var ajaxRequestList = [];
var currentAjaxRequest = null;

function setParentClass(child, parent) {
    for (key in parent.prototype) {
        child.prototype[key] = parent.prototype[key];
    }
    classParentMap[child] = parent;
}

function isInstanceOf(object, inputClass) {
    if (object == null) {
        return false;
    }
    var tempClass = object.constructor;
    while (tempClass != inputClass) {
        tempClass = classParentMap[tempClass];
        if (tempClass == undefined) {
            return false;
        }
    }
    return true;
}

// To call parent constructor:
// ParentClass.call(this, arg, arg, arg...);

function AjaxRequest(address, queryStringData, postData) {
    this.address = address;
    this.queryStringData = queryStringData;
    this.postData = postData;
    this.add();
}

AjaxRequest.prototype.add = function() {
    ajaxRequestList.push(this);
}

function convertToQueryString(data) {
    var tempList = [];
    for (key in data) {
        var tempValue = data[key];
        tempList.push(encodeURIComponent(key) + "=" + encodeURIComponent(tempValue));
    }
    return tempList.join("&");
}

AjaxRequest.prototype.send = function() {
    var tempAddress = this.address + "?" + convertToQueryString(this.queryStringData);
    var index = ajaxRequestList.indexOf(this);
    ajaxRequestList.splice(index, 1);
    currentAjaxRequest = this;
    var tempAjax = new XMLHttpRequest();
    tempAjax.onreadystatechange = function() {
        if (tempAjax.readyState == 4 && tempAjax.status == 200) {
            currentAjaxRequest.respond(JSON.parse(tempAjax.responseText));
        }
    }
    if (this.postData) {
        tempAjax.open("POST", tempAddress, true);
        tempAjax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        tempAjax.send(convertToQueryString(this.postData));
    } else {
        tempAjax.open("GET", tempAddress, true);
        tempAjax.send();
    }
}

// data will be JSON.
AjaxRequest.prototype.respond = function(data) {
    currentAjaxRequest = null;
}

function getAjaxRequestByClass(inputClass) {
    if (isInstanceOf(currentAjaxRequest, inputClass)) {
        return currentAjaxRequest;
    }
    var index = 0;
    while (index < ajaxRequestList.length) {
        var tempAjaxRequest = ajaxRequestList[index];
        if (isInstanceOf(tempAjaxRequest, inputClass)) {
            return tempAjaxRequest;
        }
        index += 1;
    }
}

function ajaxTimerEvent() {
    if (ajaxRequestList.length > 0) {
        if (currentAjaxRequest == null) {
            ajaxRequestList[0].send();
        }
    }
}

setInterval(ajaxTimerEvent, 100);

function Color(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.string = null;
}

Color.prototype.copy = function() {
    return new Color(this.r, this.g, this.b);
}

Color.prototype.scale = function(number) {
    this.r = Math.floor(this.r * number);
    this.g = Math.floor(this.g * number);
    this.b = Math.floor(this.b * number);
    if (this.r > 255) {
        this.r = 255;
    }
    if (this.g > 255) {
        this.g = 255;
    }
    if (this.b > 255) {
        this.b = 255;
    }
}

Color.prototype.addScalarIfZero = function(number) {
    if (this.r == 0) {
        this.r += number;
    }
    if (this.g == 0) {
        this.g += number;
    }
    if (this.b == 0) {
        this.b += number;
    }
    if (this.r > 255) {
        this.r = 255;
    }
    if (this.g > 255) {
        this.g = 255;
    }
    if (this.b > 255) {
        this.b = 255;
    }
}

Color.prototype.equals = function(color) {
    return (this.r == color.r && this.g == color.g && this.b == color.b);
}

Color.prototype.toString = function() {
    if (this.string === null) {
        this.string = "rgb(" + this.r + ", " + this.g + ", " + this.b + ")";
    }
    return this.string;
}

function Pos(x, y) {
    this.x = x;
    this.y = y;
}

Pos.prototype.set = function(pos) {
    this.x = pos.x;
    this.y = pos.y;
}

Pos.prototype.add = function(pos) {
    this.x += pos.x;
    this.y += pos.y;
}

Pos.prototype.subtract = function(pos) {
    this.x -= pos.x;
    this.y -= pos.y;
}

Pos.prototype.scale = function(number) {
    this.x *= number;
    this.y *= number;
}

Pos.prototype.copy = function() {
    return new Pos(this.x, this.y);
}

Pos.prototype.equals = function(pos) {
    return (this.x == pos.x && this.y == pos.y);
}

Pos.prototype.getDistance = function(pos) {
    return Math.sqrt(Math.pow(this.x - pos.x, 2) + Math.pow(this.y - pos.y, 2));
}

Pos.prototype.getOrthogonalDistance = function(pos) {
    var tempDistanceX = Math.abs(this.x - pos.x);
    var tempDistanceY = Math.abs(this.y - pos.y);
    if (tempDistanceX > tempDistanceY) {
        return tempDistanceX;
    } else {
        return tempDistanceY;
    }
}

Pos.prototype.toString = function() {
    return "(" + this.x + ", " + this.y + ")";
}

Pos.prototype.toJson = function() {
    return {
        x: this.x,
        y: this.y
    }
}

function createPosFromJson(data) {
    return new Pos(data.x, data.y);
}


