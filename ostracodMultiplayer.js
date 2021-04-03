
const express = require("express");
const pathUtils = require("path");
const favicon = require("serve-favicon");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const mustacheExpress = require("mustache-express");
const session = require("express-session")
const http = require("http");
const https = require("https");
const fs = require("fs");
const expressWs = require("express-ws");

class OstracodMultiplayer {
    
    constructor() {
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
    
    initializeServer(basePath, gameDelegate, routerList) {
        
        this.expressApp = express();
        this.mode = this.expressApp.get("env");
        this.basePath = basePath;
        this.gameDelegate = gameDelegate;
        this.configDirectory = pathUtils.join(basePath, "ostracodMultiplayerConfig");
        this.serverConfig = JSON.parse(fs.readFileSync(
            pathUtils.join(this.configDirectory, "serverConfig.json"),
            "utf8",
        ));
        this.gameConfig = JSON.parse(fs.readFileSync(
            pathUtils.join(this.configDirectory, "gameConfig.json"),
            "utf8",
        ));
        this.localViewsDirectory = pathUtils.join(__dirname, "views");
        
        this.consumerViewsDirectory = pathUtils.join(this.basePath, "views");
        for (const module of this.gameConfig.pageModules) {
            module.viewPath = pageUtils.getConsumerViewPath(module.viewFile);
            delete module.viewFile;
        }
        this.gameConfig.pageModules.push({
            name: "chat",
            buttonLabel: "Chat",
            title: "Chat",
            viewPath: pageUtils.getLocalViewPath("chatModule.html"),
            shouldShowOnLoad: false,
        });
        this.gameConfig.pageModules.push({
            name: "onlinePlayers",
            buttonLabel: "Players",
            title: "Online Players",
            viewPath: pageUtils.getLocalViewPath("onlinePlayersModule.html"),
            shouldShowOnLoad: true,
        });
        
        if (this.mode === "development") {
            console.log("WARNING: APPLICATION RUNNING IN DEVELOPMENT MODE!");
            console.log("CACHING TURNED OFF");
            console.log("ERROR REPORTING TURNED ON");
            console.log("DEBUG SPAM TURNED ON");
            console.log("SIMULATED LAG TURNED ON");
            console.log("AUTHENTICATION TURNED OFF");
            console.log("HTTPS TURNED OFF");
            this.expressApp.disable("view cache");
            this.expressApp.use(logger("dev"));
        } else if (this.mode === "production") {
            console.log("Application running in production mode.");
        } else {
            console.log("WARNING: UNRECOGNIZED APPLICATION MODE! (" + this.mode + ")");
            console.log("PLEASE USE \"development\" OR \"production\"");
            return false;
        }
        
        let server;
        if (this.mode === "development") {
            server = http.createServer(this.expressApp);
        } else {
            const privateKey = fs.readFileSync(
                pathUtils.join(this.configDirectory, "ssl.key"), "utf8",
            );
            const certificate = fs.readFileSync(
                pathUtils.join(this.configDirectory, "ssl.crt"), "utf8",
            );
            const credentials = { key: privateKey, cert: certificate };
            const tempPath = pathUtils.join(this.configDirectory, "ssl.ca-bundle");
            if (fs.existsSync(tempPath)) {
                credentials.ca = fs.readFileSync(tempPath);
            }
            server = https.createServer(credentials, this.expressApp);
        }
        expressWs(this.expressApp, server);
        
        this.expressApp.set("views", this.localViewsDirectory);
        this.expressApp.engine("html", mustacheExpress());
        
        const faviconPath = pathUtils.join(this.configDirectory, "public", "favicon.ico");
        if (fs.existsSync(faviconPath)) {
            this.expressApp.use(favicon(faviconPath));
        }
        this.expressApp.use(bodyParser.json());
        this.expressApp.use(bodyParser.urlencoded({ extended: false }));
        this.expressApp.use(cookieParser());
        this.expressApp.use(express.static(pathUtils.join(__dirname, "public")));
        this.expressApp.use(express.static(pathUtils.join(basePath, "public")));
        this.expressApp.set("trust proxy", 1);
        this.expressApp.use(session({
            secret: this.serverConfig.secret,
            resave: false,
            saveUninitialized: true,
            cookie: { maxAge: 24 * 60 * 60 * 1000 }
        }))
        
        const router = require("./router");
        this.expressApp.use("/", router);
        for (const router of routerList) {
            this.expressApp.use("/", router);
        }
        
        // Catch 404 and forward to error handler.
        this.expressApp.use((req, res, next) => {
            const tempError = new Error("Not Found");
            tempError.status = 404;
            next(tempError);
        });
        
        // Error handler.
        this.expressApp.use((error, req, res, next) => {
            const tempParameters = { message: error.message };
            if (this.mode === "development") {
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
        
        const portNumber = this.serverConfig.port;
        
        server.listen(portNumber, () => {
            console.log("Listening on port " + portNumber + ".");
        });
        
        return true;
    }
}

const ostracodMultiplayer = new OstracodMultiplayer();

module.exports = { ostracodMultiplayer };

const { dbUtils } = require("./dbUtils");
const { pageUtils } = require("./pageUtils");
const { gameUtils } = require("./gameUtils");


