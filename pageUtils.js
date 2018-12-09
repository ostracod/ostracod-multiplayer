
var fs = require("fs");
var Mustache = require("mustache");

function PageUtils() {
    
}

var pageUtils = new PageUtils();

PageUtils.prototype.renderPage = function(res, path, parameters) {
    var tempTemplate = fs.readFileSync(path, "utf8");
    var tempContent = Mustache.render(tempTemplate, parameters);
    res.render("template.html", {content: tempContent});
}

module.exports = {
    pageUtils: pageUtils
};


