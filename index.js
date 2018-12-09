
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

var mode;

function initializeServer(basePath) {
    
    var configDirectory = pathUtils.join(basePath, "ostracodMultiplayerConfig");
    
    var serverConfig = JSON.parse(fs.readFileSync(pathUtils.join(configDirectory, "serverConfig.json"), "utf8"));
    
    var app = express();
    mode = app.get("env");
    if (mode == "development") {
        console.log("WARNING: APPLICATION RUNNING IN DEVELOPMENT MODE!");
        console.log("CACHING TURNED OFF");
        console.log("ERROR REPORTING TURNED ON");
        console.log("DEBUG SPAM TURNED ON");
        console.log("SIMULATED LAG TURNED ON");
        console.log("AUTHENTICATION TURNED OFF");
        console.log("HTTPS TURNED OFF");
        app.disable("view cache");
        app.use(logger("dev"));
    } else if (mode == "production") {
        console.log("Application running in production mode.");
    } else {
        console.log("WARNING: UNRECOGNIZED APPLICATION MODE! (" + mode + ")");
        console.log("PLEASE USE \"development\" OR \"production\"");
        return false;
    }
    
    var server;
    if (mode == "development") {
        server = http.createServer(app);
    } else {
        var privateKey  = fs.readFileSync(pathUtils.join(configDirectory, "ssl.key"), "utf8");
        var certificate = fs.readFileSync(pathUtils.join(configDirectory, "ssl.crt"), "utf8");
        var credentials = {key: privateKey, cert: certificate};
        server = https.createServer(credentials, app);
    }
    expressWs(app, server);
    
    app.set("views", pathUtils.join(__dirname, "views"));
    app.engine("html", mustacheExpress());
    
    var faviconPath = pathUtils.join(configDirectory, "public", "favicon.ico");
    if (fs.existsSync(faviconPath)) {
        app.use(favicon(faviconPath));
    }
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(cookieParser());
    app.use(express.static(pathUtils.join(__dirname, "public")));
    app.set("trust proxy", 1);
    app.use(session({
        secret: serverConfig.secret,
        resave: false,
        saveUninitialized: true,
        cookie: {maxAge: 24 * 60 * 60 * 1000}
    }))
    
    var router = require("./router");
    app.use("/", router);
    
    // Catch 404 and forward to error handler.
    app.use(function(req, res, next) {
        var tempError = new Error("Not Found");
        tempError.status = 404;
        next(tempError);
    });
    
    // Error handler.
    app.use(function(error, req, res, next) {
        var tempPageData = {message: error.message};
        if (mode == "development") {
            tempPageData.error = error;
        }
        if (error.status) {
            res.status(error.status);
        } else {
            res.status(500);
        }
        res.render("error.html", tempPageData);
    });
    
    var portNumber = serverConfig.port;
    
    server.listen(portNumber, function() {
        console.log("Listening on port " + portNumber + ".");
    });
    
    return true;
}

function getMode() {
    return mode;
}

module.exports = {
    initializeServer: initializeServer,
    getMode: getMode
}


