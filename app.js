// TODO: make distinction between username and user ID
// TODO: avoid sync when possible

const express = require("express");
const bodyParser = require("body-parser");
// https://blog.logrocket.com/password-hashing-node-js-bcrypt/
const bcrypt = require("bcrypt");
const fs = require("fs");
// https://stackoverflow.com/questions/8855687/secure-random-token-in-node-js
const crypto = require("crypto");

const SALT_ROUNDS = 10;

const app = express();

app.use(express.static("client"));
app.use(express.urlencoded());
// https://stackoverflow.com/questions/45032412/sending-data-from-javascript-html-page-to-express-nodejs-server
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

function readDatabase() {
    return JSON.parse(fs.readFileSync("secrets/database.json"));
}

function writeDatabase(database) {
    fs.writeFileSync("secrets/database.json", JSON.stringify(database));
}

const MINUTES = 60;
const HOURS = 24 * MINUTES;
const SESSION_EXPIRY_TIME = 6 * HOURS;

const SESSION_TOKEN_LENGTH = 64;

// I have no idea if this is how you're meant to do things, I'm just guessing
function generateSessionID(userData) {
    // https://stackoverflow.com/questions/8855687/secure-random-token-in-node-js
    // Generate 64 cryptographically secure random bytes as a session ID
    let sessionID = crypto.randomBytes(SESSION_TOKEN_LENGTH).toString("hex");

    // TODO: should remember this session ID, and if someone tries to connect using it, give them an appropriate error message

    userData.sessionID = sessionID;
    userData.sessionStart = new Date();

    return sessionID;
}

// Is alphanumeric (+ some special characters), some length
function isValidText(text) {
    if (text == null) return false;

    return text.match(/^[a-zA-Z0-9_]+$/);
}

// Minimum of 8 characters long
function isValidPassword(text) {
    if (text == null) return false;

    return text.match(/^.{8,}/);
}

// Returns if a session ID is valid for a given user
function validateSession(userID, sessionID, resp) {
    let database = readDatabase();

    // TODO: validate session expiry
    if (userID in database)
        return database[userID].sessionID == sessionID;

    return false;
}

const USERNAME_ALPHANUMERIC = "Username must be alphanumeric";
const USERNAME_TAKEN = "Username is already taken";

const USER_DOESNT_EXIST = "User doesn't exist";

const CONFIRM_PASSWORD_NO_MATCH = "Password doesn't match confirmation password";
const PASSWORD_TOO_SHORT = "Password is too short, must be 8 characters or longer";
const PASSWORD_HASH_NO_MATCH = "Username or password is incorrect";
const INVALID_SESSION = "Session is invalid";
const NOT_LOGGED_IN = "Not logged in";

app.post("/createAccount", (req, resp) => {
    let username = req.body.username;
    let password = req.body.password;

    // First check username is alphanumeric
    if (!isValidText(username)) return resp.status(401).send(USERNAME_ALPHANUMERIC);

    let database = readDatabase();

    // Check username isn't taken already
    if (username in database) {
        return resp.status(401).send(USERNAME_TAKEN);
    }

    // Check for a valid passsword    
    if (!isValidPassword(password)) return resp.status(401).send(PASSWORD_TOO_SHORT);
    // Check password and confirmation password match
    if (req.body.password != req.body.confirmPassword) return resp.status(401).send(CONFIRM_PASSWORD_NO_MATCH);

    // All checks passed!
    // Hash and store password
    let hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);

    database[username] = {
        "password": hashedPassword,
        "sessionID": null,
        "sessionStart": new Date()
    };

    // Respond with session ID
    resp.status(200).send(generateSessionID(database[username]));

    fs.writeFileSync(`secrets/circuits/${username}.json`, "{}");

    writeDatabase(database);
});

app.post("/login", (req, resp) => {
    let username = req.body.username;
    // Please ignore the fact that this isn't a HTTPS server, and so we're basically just sending the password
    // plaintext. I did try setting up some keys and even made a CSR, but I'd have to send that to a CA (I think?), and that seems like too much work.
    let password = req.body.password;

    if (!isValidText(username)) return resp.status(401).send(USERNAME_ALPHANUMERIC);

    // Lookup username in our "database"
    let database = readDatabase();
    
    let userData = database[username];

    if (userData == undefined) return resp.status(401).send(USER_DOESNT_EXIST);

    let hashedPassword = userData.password;

    // https://blog.logrocket.com/password-hashing-node-js-bcrypt/
    let result = bcrypt.compareSync(password, hashedPassword);

    if (result) {
        // This isn't a HTTPS server, so these session IDs also are meaningless, they can just be stolen
        resp.status(200).send(generateSessionID(userData));
    } else {
        return resp.status(403).send(PASSWORD_HASH_NO_MATCH);
    }

    writeDatabase(database);
});

app.get("/getCircuits", (req, resp) => {
    let username = req.query.username;
    let sessionID = req.query.sessionID;

    if (username == null || sessionID == null) return resp.status(403).send(NOT_LOGGED_IN);
    if (!isValidText(username)) return resp.status(401).send(USERNAME_ALPHANUMERIC);

    if (validateSession(username, sessionID)) {
        return resp.status(200).send(fs.readFileSync(`secrets/circuits/${username}.json`));
    } else {
        return resp.status(403).send(INVALID_SESSION);
    }
});

app.post("/saveCircuit", (req, resp) => {
    let username = req.body.username;
    let sessionID = req.body.sessionID;
    let circuitName = req.body.circuitName;
    let circuitData = req.body.circuitData;

    if (username == null || sessionID == null) return resp.status(403).send(NOT_LOGGED_IN);
    if (!validateSession(username, sessionID)) return resp.status(403).send(INVALID_SESSION);
    if (!isValidText(username)) return resp.status(401).send(USERNAME_ALPHANUMERIC);

    let circuitFilePath = `secrets/circuits/${username}.json`;
    let userData;

    if (fs.existsSync(circuitFilePath))
    {
        userData = JSON.parse(fs.readFileSync(circuitFilePath));
    }
    else
        userData = {};

    if (!isValidText(circuitName)) return resp.status(401).send("Circuit must have alphanumeric name");

    if (circuitName in userData)
        return resp.status(401).send("Circuit with same name already created");

    userData[circuitName] = circuitData;

    fs.writeFileSync(circuitFilePath, JSON.stringify(userData));

    return resp.status(200).send("Saved circuit successfully");
});

const PORT = 8090;

app.listen(PORT, () => {
    console.log(`Started on port ${PORT}`)
})