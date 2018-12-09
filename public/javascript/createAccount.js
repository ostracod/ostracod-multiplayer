
var isCreatingAccount = false;

function CreateAccountRequest(username, password, emailAddress) {
    if (isCreatingAccount) {
        return;
    }
    isCreatingAccount = true;
    document.getElementById("message").innerHTML = "Creating account...";
    AjaxRequest.call(this, "createAccountAction", {}, {
        username: username,
        password: password,
        emailAddress: emailAddress
    });
}
setParentClass(CreateAccountRequest, AjaxRequest);

CreateAccountRequest.prototype.respond = function(data) {
    isCreatingAccount = false;
    document.getElementById("message").innerHTML = "";
    if (data.success) {
        alert("Your account was created successfully.");
        window.location = "login";
    } else {
        alert(data.message);
    }
    AjaxRequest.prototype.respond.call(this, data);
}

function processFields() {
    var tempUsername = document.getElementById("username").value;
    var tempPassword = document.getElementById("password").value;
    var tempConfirmPassword = document.getElementById("confirmPassword").value;
    var tempEmailAddress = document.getElementById("emailAddress").value;
    if (tempUsername.length < 1) {
        alert("Please enter a username.");
        return;
    }
    if (tempUsername.length > 30) {
        alert("Your username must be at most 30 characters long.");
        return;
    }
    if (tempPassword.length < 1) {
        alert("Please enter your password.");
        return;
    }
    if (tempPassword != tempConfirmPassword) {
        alert("The passwords you entered do not match.");
        return;
    }
    if (tempEmailAddress.length < 1) {
        alert("Please enter an email address.");
        return;
    }
    if (tempEmailAddress.indexOf("@") < 0 || tempEmailAddress.indexOf(".") < 0) {
        alert("Please enter a valid email address.");
        return;
    }
    new CreateAccountRequest(tempUsername, tempPassword, tempEmailAddress);
    return;
}


