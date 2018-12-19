
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
    this.expressApp = null;
    this.mode = null;
    this.basePath = null;
    this.configDirectory = null;
    this.serverConfig = null;
    this.gameConfig = null;
    this.consumerViewsDirectory = null;
    this.localViewsDirectory = null;
    this.gameDelegate = null;
}

var ostracodMultiplayer = new OstracodMultiplayer();

module.exports = {
    ostracodMultiplayer: ostracodMultiplayer,
}

var dbUtils = require("./dbUtils").dbUtils;
var pageUtils = require("./pageUtils").pageUtils;
var gameUtils = require("./gameUtils").gameUtils;

OstracodMultiplayer.prototype.initializeServer = function(basePath, gameDelegate, routerList) {
    
    this.expressApp = express();
    this.mode = this.expressApp.get("env");
    this.basePath = basePath;
    this.gameDelegate = gameDelegate;
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
    
    this.consumerViewsDirectory = pathUtils.join(this.basePath, "views");
    var index = 0;
    while (index < this.gameConfig.pageModules.length) {
        var tempModule = this.gameConfig.pageModules[index];
        tempModule.viewPath = pageUtils.getConsumerViewPath(tempModule.viewFile);
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
        this.expressApp.disable("view cache");
        this.expressApp.use(logger("dev"));
    } else if (this.mode == "production") {
        console.log("Application running in production mode.");
    } else {
        console.log("WARNING: UNRECOGNIZED APPLICATION MODE! (" + this.mode + ")");
        console.log("PLEASE USE \"development\" OR \"production\"");
        return false;
    }
    
    var server;
    if (this.mode == "development") {
        server = http.createServer(this.expressApp);
    } else {
        var privateKey  = fs.readFileSync(pathUtils.join(this.configDirectory, "ssl.key"), "utf8");
        var certificate = fs.readFileSync(pathUtils.join(this.configDirectory, "ssl.crt"), "utf8");
        var credentials = {key: privateKey, cert: certificate};
        server = https.createServer(credentials, this.expressApp);
    }
    expressWs(this.expressApp, server);
    
    this.expressApp.set("views", this.localViewsDirectory);
    this.expressApp.engine("html", mustacheExpress());
    
    var faviconPath = pathUtils.join(this.configDirectory, "public", "favicon.ico");
    if (fs.existsSync(faviconPath)) {
        this.expressApp.use(favicon(faviconPath));
    }
    this.expressApp.use(bodyParser.json());
    this.expressApp.use(bodyParser.urlencoded({extended: false}));
    this.expressApp.use(cookieParser());
    this.expressApp.use(express.static(pathUtils.join(__dirname, "public")));
    this.expressApp.use(express.static(pathUtils.join(basePath, "public")));
    this.expressApp.set("trust proxy", 1);
    this.expressApp.use(session({
        secret: this.serverConfig.secret,
        resave: false,
        saveUninitialized: true,
        cookie: {maxAge: 24 * 60 * 60 * 1000}
    }))
    
    var router = require("./router");
    this.expressApp.use("/", router);
    var index = 0;
    while (index < routerList.length) {
        var tempRouter = routerList[index];
        this.expressApp.use("/", tempRouter);
        index += 1;
    }
    
    // Catch 404 and forward to error handler.
    this.expressApp.use(function(req, res, next) {
        var tempError = new Error("Not Found");
        tempError.status = 404;
        next(tempError);
    });
    
    // Error handler.
    this.expressApp.use(function(error, req, res, next) {
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
    gameUtils.initialize();
    
    var portNumber = this.serverConfig.port;
    
    server.listen(portNumber, function() {
        console.log("Listening on port " + portNumber + ".");
    });
    
    return true;
}


