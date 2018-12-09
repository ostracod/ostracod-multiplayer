
var ostracodMultiplayer = require("ostracod-multiplayer").ostracodMultiplayer;

console.log("Starting OstracodMultiplayer...");

var tempResult = ostracodMultiplayer.initializeServer(__dirname);

if (!tempResult) {
    process.exit(1);
}


