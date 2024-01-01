// TODO: avoid sync when possible

const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const crypto = require("crypto");

const SALT_ROUNDS = 10;

const app = express();

app.use(express.static("client"));
app.use(express.json());
app.use(express.urlencoded());
// https://stackoverflow.com/questions/45032412/sending-data-from-javascript-html-page-to-express-nodejs-server
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Read our user database
function readDatabase() {
    return JSON.parse(fs.readFileSync("secrets/database.json"));
}

// Write to our user database
function writeDatabase(database) {
    fs.writeFileSync("secrets/database.json", JSON.stringify(database));
}

const MINUTES = 60;
const HOURS = 24 * MINUTES;
const SESSION_EXPIRY_TIME = 6 * HOURS;

const SESSION_TOKEN_LENGTH = 64;

// I have no idea if this is how you're meant to do things, I'm just guessing
// Creates a new session token
function createNewSessionToken() {
    // https://stackoverflow.com/questions/8855687/secure-random-token-in-node-js
    // Generate 64 cryptographically secure random bytes as a session ID
    return crypto.randomBytes(SESSION_TOKEN_LENGTH).toString("hex");
}

// Check a piece of text is alphanumeric (+ some special characters), non-zero size
function isValidText(text) {
    if (text == null) return false;

    return text.match(/^[a-zA-Z0-9_\-\w]+$/);
}

// Check a password is longer than 8 characters
function isValidPassword(text) {
    if (text == null) return false;

    return text.match(/^.{8,}/);
}

// Wrap a response text with a json object
function responseJSON(errorMessage) {
    return {"response": errorMessage};
}

const USERNAME_ALPHANUMERIC_MESSAGE = "Username must be alphanumeric";
const USERNAME_TAKEN_MESSAGE = "Username is already taken";

const USER_DOESNT_EXIST_MESSAGE = "User doesn't exist";

const PASSWORD_TOO_SHORT_MESSAGE = "Password is too short, must be 8 characters or longer";
const PASSWORD_HASH_NO_MATCH_MESSAGE = "Username or password is incorrect";
const SESSION_INVALID_MESSAGE = "Session is invalid";
const NOT_LOGGED_IN_MESSAGE = "Not logged in";
const SESSION_EXPIRED_MESSAGE = "Session has expired";

const USER_NO_SAVED_CIRCUITS_MESSAGE = "User had no saved circuits";
const USER_NO_CIRCUIT_WITH_NAME_MESSAGE = "User had no circuit with the given name";

const CIRCUIT_ALPHANUMERIC_MESSAGE = "Circuit name must be alphanumeric";
const CIRCUIT_NAME_TAKEN_MESSAGE = "Circuit with same name already created";
const CIRCUIT_SAVED_SUCESSFULLY_MESSAGE = "Saved circuit successfully";

// Validate a session token for a given user
function validateSession(username, sessionToken, resp, successCallback) {
    let database = readDatabase();

    if (username in database) {
        let userData = database[username];

        if (new Date() - userData.sessionStart > SESSION_EXPIRY_TIME) return resp.status(400).send(responseJSON(SESSION_EXPIRED_MESSAGE));
        if (userData.sessionToken != sessionToken) return resp.status(403).send(responseJSON(SESSION_INVALID_MESSAGE));
    }

    return successCallback();
}

// Get the circuit file for a given user
function getCircuitFile(username, resp, successCallback) {
    let database = readDatabase();

    if (!(username in database)) return resp.status(404).send(responseJSON(USER_DOESNT_EXIST_MESSAGE));
    if (!isValidText(username)) return resp.status(400).send(responseJSON(USERNAME_ALPHANUMERIC_MESSAGE));

    let circuitPath = `secrets/circuits/${username}.json`;

    if (!fs.existsSync(circuitPath)) return resp.status(404).send(responseJSON(USER_NO_SAVED_CIRCUITS_MESSAGE));

    return successCallback(database, JSON.parse(fs.readFileSync(circuitPath)), circuitPath);
}

function postCreateAccount(req, resp) {
    let username = req.body.username;
    let password = req.body.password;

    // First check username is alphanumeric
    if (!isValidText(username)) return resp.status(400).send(responseJSON(USERNAME_ALPHANUMERIC_MESSAGE));

    let database = readDatabase();

    // Check username isn't taken already
    if (username in database) {
        return resp.status(400).send(responseJSON(USERNAME_TAKEN_MESSAGE));
    }

    // Check for a valid passsword    
    if (!isValidPassword(password)) return resp.status(400).send(responseJSON(PASSWORD_TOO_SHORT_MESSAGE));

    // All checks passed!
    // Hash and store password
    let hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);
    let sessionToken = createNewSessionToken();

    database[username] = {
        "password": hashedPassword,
        "sessionToken": sessionToken,
        "sessionStart": new Date(),
        "totalDownloads": 0
    };

    // Respond with session ID
    resp.status(200).send({"sessionToken": sessionToken});

    // Create empty circuit data file
    fs.writeFileSync(`secrets/circuits/${username}.json`, "{}");

    writeDatabase(database);
}

function postLogin(req, resp) {
    let username = req.body.username;
    // This isn't a HTTPS server, so we're just sending the password unencrypted, so while we may have safe password storage, we're
    // vulnerable to man-in-the-middle attacks (I think?) with both passwords and session tokens
    let password = req.body.password;

    if (!isValidText(username)) return resp.status(400).send(responseJSON(USERNAME_ALPHANUMERIC_MESSAGE));

    // Lookup username in our "database"
    let database = readDatabase();
    
    let userData = database[username];

    if (userData == undefined) return resp.status(404).send(responseJSON(USER_DOESNT_EXIST_MESSAGE));

    let hashedPassword = userData.password;

    // https://blog.logrocket.com/password-hashing-node-js-bcrypt/
    let result = bcrypt.compareSync(password, hashedPassword);

    if (result) {
        let sessionToken = createNewSessionToken();

        userData.sessionToken = sessionToken;
        userData.sessionStart = new Date();
        
        resp.status(200).send({"sessionToken": sessionToken});
    }
    else {
        return resp.status(400).send(responseJSON(PASSWORD_HASH_NO_MATCH_MESSAGE));
    }

    writeDatabase(database);
}

function getUsers(req, resp) {
    console.log("Recieved request");

    let database = readDatabase();

    let userData = [];

    for (username in database) {
        let entry = database[username];

        userData.push({
            "username": username,
            "totalDownloads": entry.totalDownloads
        });
    }
    
    resp.status(200).send(userData);
}

function getUser(req, resp) {
    let username = req.query.username;

    return getCircuitFile(username, resp, (database, circuitFile, path) => {
        let circuitNames = Object.keys(circuitFile);

        if (circuitNames.length == 0)
            return resp.status(404).send(responseJSON(USER_NO_SAVED_CIRCUITS_MESSAGE));

        let circuitMetricData = [];
    
        for (circuitName in circuitFile) {
            let entry = circuitFile[circuitName];

            circuitMetricData.push({
                "circuitName": circuitName,
                "downloads": entry.downloads
            });
        }

        return resp.status(200).send(circuitMetricData);
    });
}

function getCircuits(req, resp) {
    let username = req.query.username;

    return getCircuitFile(username, resp, (database, circuitFile, path) => {
        let circuitNames = Object.keys(circuitFile);

        if (circuitNames.length == 0)
            return resp.status(404).send(responseJSON(USER_NO_SAVED_CIRCUITS_MESSAGE));
    
        return resp.status(200).send({"circuitNames": circuitNames});
    });
}

function getCircuit(req, resp) {
    let username = req.query.username;
    let circuitName = req.query.circuitName;

    return getCircuitFile(username, resp, (database, circuitFile, path) => {
        if (Object.keys(circuitFile).length == 0) return resp.status(404).send(responseJSON(USER_NO_SAVED_CIRCUITS_MESSAGE));
        if (!(circuitName in circuitFile)) return resp.status(404).send(responseJSON(USER_NO_CIRCUIT_WITH_NAME_MESSAGE));

        // Increment total download count
        database[username].totalDownloads++;
        writeDatabase(database);

        // Increment download count for that circuit
        circuitFile[circuitName].downloads++;
        fs.writeFileSync(path, JSON.stringify(circuitFile));
    
        return resp.status(200).send({"name": circuitName, "data": circuitFile[circuitName]});
    });
}

function postSaveCircuit(req, resp) {
    let username = req.body.username;
    let sessionToken = req.body.sessionToken;
    let circuitName = req.body.circuitName;
    let circuitData = req.body.circuitData;

    if (username == null || sessionToken == null) return resp.status(401).send(responseJSON(NOT_LOGGED_IN_MESSAGE));
    if (!isValidText(circuitName)) return resp.status(400).send(responseJSON(CIRCUIT_ALPHANUMERIC_MESSAGE));
    
    // mini-callback hell
    return validateSession(username, sessionToken, resp, () => {
        if (!isValidText(username)) return resp.status(400).send(wrapJSON(USERNAME_ALPHANUMERIC_MESSAGE));

        return getCircuitFile(username, resp, (database, circuitFile, path) => {
            if (circuitName in circuitFile) return resp.status(400).send(responseJSON(CIRCUIT_NAME_TAKEN_MESSAGE));

            circuitFile[circuitName] = {
                "circuits": circuitData.circuits,
                "inputNodes": circuitData.inputNodes,
                "outputNodes": circuitData.outputNodes,
                "downloads": 0
            };

            fs.writeFileSync(path, JSON.stringify(circuitFile));

            return resp.status(200).send(responseJSON(CIRCUIT_SAVED_SUCESSFULLY_MESSAGE));
        });
    });
}

app.post("/createAccount", postCreateAccount);
app.post("/login", postLogin);
app.get("/getUsers", getUsers);
app.get("/getUser", getUser);

app.get("/getCircuits", getCircuits);
app.get("/getCircuit", getCircuit)
app.post("/saveCircuit", postSaveCircuit);

module.exports = { "app": app, "isValidPassword": isValidPassword, "isValidText": isValidText, "responseJSON": responseJSON };