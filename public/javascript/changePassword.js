
var isChangingPassword = false;

function ChangePasswordRequest(oldPassword, newPassword) {
    if (isChangingPassword) {
        return;
    }
    isChangingPassword = true;
    document.getElementById("message").innerHTML = "Changing password...";
    AjaxRequest.call(this, "changePasswordAction", {}, {
        oldPassword: oldPassword,
        newPassword: newPassword
    });
}
setParentClass(ChangePasswordRequest, AjaxRequest);

ChangePasswordRequest.prototype.respond = function(data) {
    isChangingPassword = false;
    document.getElementById("message").innerHTML = "";
    if (data.success) {
        alert("Your password was changed successfully.");
        window.location = "menu";
    } else {
        alert(data.message);
    }
    AjaxRequest.prototype.respond.call(this, data);
}

function processFields() {
    var tempOldPassword = document.getElementById("oldPassword").value;
    var tempNewPassword = document.getElementById("newPassword").value;
    var tempConfirmPassword = document.getElementById("confirmPassword").value;
    if (tempOldPassword.length < 1) {
        alert("Please enter your old password.");
        return;
    }
    if (tempNewPassword.length < 1) {
        alert("Please enter your new password.");
        return;
    }
    if (tempNewPassword != tempConfirmPassword) {
        alert("The new passwords you entered do not match.");
        return;
    }
    new ChangePasswordRequest(tempOldPassword, tempNewPassword);
    return;
}


