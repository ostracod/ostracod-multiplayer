
var express = require("express");
var pathUtils = require("path");
var favicon = require("serve-favicon");
var logger = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var mustacheExpress = require("mustache-express");
var session = require("express-session")
var http = require("http");
var https = require("https");
var fs = require("fs");
var expressWs = require("express-ws");

function OstracodMultiplayer() {
    this.mode = null;
    this.basePath = null;
    this.configDirectory = null;
    this.serverConfig = null;
    this.gameConfig = null;
    this.localViewsDirectory = null;
}

var ostracodMultiplayer = new OstracodMultiplayer();

module.exports = {
    ostracodMultiplayer: ostracodMultiplayer,
}

var dbUtils = require("./dbUtils").dbUtils;
var pageUtils = require("./pageUtils").pageUtils;
var router = require("./router");

OstracodMultiplayer.prototype.initializeServer = function(basePath) {
    
    this.app = express();
    this.mode = this.app.get("env");
    this.basePath = basePath;
    this.configDirectory = pathUtils.join(basePath, "ostracodMultiplayerConfig");
    this.serverConfig = JSON.parse(fs.readFileSync(
        pathUtils.join(this.configDirectory, "serverConfig.json"),
        "utf8"
    ));
    this.gameConfig = JSON.parse(fs.readFileSync(
        pathUtils.join(this.configDirectory, "gameConfig.json"),
        "utf8"
    ));
    this.localViewsDirectory = pathUtils.join(__dirname, "views");
    
    var tempViewDirectory = pathUtils.join(this.basePath, "views");
    var index = 0;
    while (index < this.gameConfig.pageModules.length) {
        var tempModule = this.gameConfig.pageModules[index];
        tempModule.viewPath = pathUtils.join(tempViewDirectory, tempModule.viewFile);
        delete tempModule.viewFile;
        index += 1;
    }
    this.gameConfig.pageModules.push({
        name: "chat",
        buttonLabel: "Chat",
        title: "Chat",
        viewPath: pageUtils.getLocalViewPath("chatModule.html"),
        shouldShowOnLoad: false
    });
    this.gameConfig.pageModules.push({
        name: "onlinePlayers",
        buttonLabel: "Players",
        title: "Online Players",
        viewPath: pageUtils.getLocalViewPath("onlinePlayersModule.html"),
        shouldShowOnLoad: true
    });
    
    if (this.mode == "development") {
        console.log("WARNING: APPLICATION RUNNING IN DEVELOPMENT MODE!");
        console.log("CACHING TURNED OFF");
        console.log("ERROR REPORTING TURNED ON");
        console.log("DEBUG SPAM TURNED ON");
        console.log("SIMULATED LAG TURNED ON");
        console.log("AUTHENTICATION TURNED OFF");
        console.log("HTTPS TURNED OFF");
        this.app.disable("view cache");
        this.app.use(logger("dev"));
    } else if (this.mode == "production") {
        console.log("Application running in production mode.");
    } else {
        console.log("WARNING: UNRECOGNIZED APPLICATION MODE! (" + this.mode + ")");
        console.log("PLEASE USE \"development\" OR \"production\"");
        return false;
    }
    
    var server;
    if (this.mode == "development") {
        server = http.createServer(this.app);
    } else {
        var privateKey  = fs.readFileSync(pathUtils.join(this.configDirectory, "ssl.key"), "utf8");
        var certificate = fs.readFileSync(pathUtils.join(this.configDirectory, "ssl.crt"), "utf8");
        var credentials = {key: privateKey, cert: certificate};
        server = https.createServer(credentials, this.app);
    }
    expressWs(this.app, server);
    
    this.app.set("views", this.localViewsDirectory);
    this.app.engine("html", mustacheExpress());
    
    var faviconPath = pathUtils.join(this.configDirectory, "public", "favicon.ico");
    if (fs.existsSync(faviconPath)) {
        this.app.use(favicon(faviconPath));
    }
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({extended: false}));
    this.app.use(cookieParser());
    this.app.use(express.static(pathUtils.join(__dirname, "public")));
    this.app.use(express.static(pathUtils.join(basePath, "public")));
    this.app.set("trust proxy", 1);
    this.app.use(session({
        secret: this.serverConfig.secret,
        resave: false,
        saveUninitialized: true,
        cookie: {maxAge: 24 * 60 * 60 * 1000}
    }))
    
    this.app.use("/", router);
    
    // Catch 404 and forward to error handler.
    this.app.use(function(req, res, next) {
        var tempError = new Error("Not Found");
        tempError.status = 404;
        next(tempError);
    });
    
    // Error handler.
    this.app.use(function(error, req, res, next) {
        var tempParameters = {message: error.message};
        if (this.mode == "development") {
            tempParameters.error = error;
        }
        if (error.status) {
            res.status(error.status);
        } else {
            res.status(500);
        }
        res.render("error.html", tempParameters);
    });
    
    dbUtils.initialize();
    
    var portNumber = this.serverConfig.port;
    
    server.listen(portNumber, function() {
        console.log("Listening on port " + portNumber + ".");
    });
    
    return true;
}


