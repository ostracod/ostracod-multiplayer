
var fs = require("fs");
var Mustache = require("mustache");

function PageUtils() {
    
}

var pageUtils = new PageUtils();

module.exports = {
    pageUtils: pageUtils
};

var ostracodMultiplayer = require("./ostracodMultiplayer").ostracodMultiplayer;

PageUtils.prototype.renderPage = function(res, path, scriptList, parameters) {
    var tempTemplate = fs.readFileSync(path, "utf8");
    var tempContent = Mustache.render(tempTemplate, parameters);
    res.render("template.html", {
        gameName: ostracodMultiplayer.serverConfig.gameName.toUpperCase(),
        scripts: scriptList,
        content: tempContent
    });
}


