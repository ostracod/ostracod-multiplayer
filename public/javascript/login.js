
var isLoggingIn = false;

function LoginRequest(username, password) {
    if (isLoggingIn) {
        return;
    }
    isLoggingIn = true;
    document.getElementById("message").innerHTML = "Logging in...";
    AjaxRequest.call(this, "loginAction", {}, {
        username: username,
        password: password
    });
}
setParentClass(LoginRequest, AjaxRequest);

LoginRequest.prototype.respond = function(data) {
    isLoggingIn = false;
    document.getElementById("message").innerHTML = "";
    if (data.success) {
        window.location = "menu";
    } else {
        alert(data.message);
    }
    AjaxRequest.prototype.respond.call(this, data);
}

function processFields() {
    var tempUsername = document.getElementById("username").value;
    var tempPassword = document.getElementById("password").value;
    if (tempUsername.length < 1) {
        alert("Please enter a username.");
        return;
    }
    if (tempPassword.length < 1) {
        alert("Please enter your password.");
        return;
    }
    new LoginRequest(tempUsername, tempPassword);
    return;
}


