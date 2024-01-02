const request = require("supertest");

// TODO: check content types
// TODO: check data

jest.mock("fs", () => {
    const originalModule = jest.requireActual("fs");

    // https://github.com/jestjs/jest/blob/main/examples/manual-mocks/__mocks__/fs.js
    let mockFiles = Object.create(null);

    function __setMockFiles(newMockFiles) {
        mockFiles = Object.create(null);

        // TODO: clean up path slightly
        for (const file in newMockFiles) {
            mockFiles[file] = newMockFiles[file];
        }
    }

    function readFileSync(path) {
        return mockFiles[path];
    }

    function writeFileSync(path, data) {
        mockFiles[path] = data;
    }

    function existsSync(path) {
        return Object.keys(mockFiles).includes(path);
    }

    return {
        __esModule: true,
        ...originalModule,
        readFileSync: jest.fn((path) => readFileSync(path)),
        writeFileSync: jest.fn((path, data) => writeFileSync(path, data)),
        existsSync: jest.fn((path) => existsSync(path)),
        __setMockFiles: jest.fn((newMockFiles) => __setMockFiles(newMockFiles))
    };
});

const app = require("./app");

describe("Text validation", () => {
    test("accept text with numbers", () => {
        expect(!!app.isValidText("qwerty432uiop")).toBe(true);
    });

    test("reject text with dangerous characters", () => {
        expect(!!app.isValidText("<script>blah</script>")).toBe(false);
    });

    test("reject null and undefined as input", () => {
        expect(!!app.isValidText(null)).toBe(false);
        expect(!!app.isValidText(undefined)).toBe(false);
    });

    test("reject empty string", () => {
        expect(!!app.isValidText("")).toBe(false);
    });

    test("accept dashes and underscores", () => {
        expect(!!app.isValidText("qwerty-ui_op123")).toBe(true);
    });
});

describe("Password validation", () => {
    test("accept password with exactly 8 characters", () => {
        expect(!!app.isValidPassword("12345678")).toBe(true);
    });

    test("accept password with more than 8 characters", () => {
        expect(!!app.isValidPassword("123456789")).toBe(true);
    });

    test("reject null and undefined as input", () => {
        expect(!!app.isValidPassword(null)).toBe(false);
        expect(!!app.isValidPassword(undefined)).toBe(false);
    });

    test("reject password with 7 characters or fewer", () => {
        expect(!!app.isValidPassword("")).toBe(false);
        expect(!!app.isValidPassword("1")).toBe(false);
        expect(!!app.isValidPassword("123")).toBe(false);
        expect(!!app.isValidPassword("1234")).toBe(false);
    });
});

// Pretty stupid test, but code coverage yay
describe("responseJSON functionality", () => {
    test("returns json", () => {
        expect(app.responseJSON("")).toBeInstanceOf(Object);
    });

    test("has field response", () => {
        expect(app.responseJSON("")).toHaveProperty("response", "");
    });
});

describe("POST /createAccount", () => {
    const MOCK_FILE_INFO = {
        "secrets/database.json": `{"existing":{
            "password": "$2b$10$DVibo4zGrhpXtBQ6czkmQeRTQqZMSQpQEZKyKQltXXIvvTAVj61ny",
            "sessionToken": "3c38504bb671e283d7df62ba5dc37a06465b3c045f989d83da12b2848de1b8fd4f77fe3cc5f06369c1589cd76861db806d22412fdb9e29e0fd5481cb198cb10a",
            "sessionStart": "2023-12-29T12:54:55.018Z",
            "totalDownloads": 8
        }}`
    };

    beforeEach(() => {
        require("fs").__setMockFiles(MOCK_FILE_INFO);
    });

    test("account can be created", () => {
        const ACCOUNT_DATA = {
            "username": "valid",
            "password": "<script>cool password</script>"
        };

        return request(app.app).post("/createAccount").send(ACCOUNT_DATA).expect(200).expect("Content-type", /json/);
    });

    test("account with dangerous details is rejected", () => {
        const ACCOUNT_DATA = {
            "username": "../database.json",
            "password": "password123"
        };

        return request(app.app).post("/createAccount").send(ACCOUNT_DATA).expect(400).expect("Content-type", /json/);
    });

    test("existing username cannot be used", () => {
        const ACCOUNT_DATA = {
            "username": "existing",
            "password": "password123"
        };

        return request(app.app).post("/createAccount").send(ACCOUNT_DATA).expect(400).expect("Content-type", /json/);
    });
});

describe("POST /login", () => {
    const MOCK_FILE_INFO = {
        "secrets/database.json": `{"thomas":{
            "password": "$2b$10$DVibo4zGrhpXtBQ6czkmQeRTQqZMSQpQEZKyKQltXXIvvTAVj61ny",
            "sessionToken": "3c38504bb671e283d7df62ba5dc37a06465b3c045f989d83da12b2848de1b8fd4f77fe3cc5f06369c1589cd76861db806d22412fdb9e29e0fd5481cb198cb10a",
            "sessionStart": "2023-12-29T12:54:55.018Z",
            "totalDownloads": 8
        }}`
    };

    beforeEach(() => {
        require("fs").__setMockFiles(MOCK_FILE_INFO);
    });

    test("account with correct password logged into", () => {
        const ACCOUNT_DATA = {
            "username": "thomas",
            "password": "password"
        };

        return request(app.app).post("/login").send(ACCOUNT_DATA).expect(200).expect("Content-type", /json/);
    });

    test("incorrect password prevents login", () => {
        const ACCOUNT_DATA = {
            "username": "thomas",
            "password": "password_wrong"
        };

        return request(app.app).post("/login").send(ACCOUNT_DATA).expect(400).expect("Content-type", /json/);
    });

    test("cannot log into account with non-existant username", () => {
        const ACCOUNT_DATA = {
            "username": "foo",
            "password": "password"
        };

        return request(app.app).post("/login").send(ACCOUNT_DATA).expect(404).expect("Content-type", /json/);
    });
});

describe("GET /getUsers", () => {
    const MOCK_FILE_INFO = {
        "secrets/database.json": `{"thomas":{
            "totalDownloads": 8
        }, "thomas2": {"totalDownloads": 13}}`
    };

    beforeEach(() => {
        require("fs").__setMockFiles(MOCK_FILE_INFO);
    });

    test("gets all users and correct download counts", () => {
        return request(app.app).get("/getUsers").send().expect(200).expect("Content-type", /json/);
    });
});

describe("GET /getUser", () => {
    const MOCK_FILE_INFO = {
        "secrets/database.json": `{"thomas":{
            "totalDownloads": 8
        }, "thomas2": {"totalDownloads": 13}}`,
        "secrets/circuits/thomas.json": `{"NAND":{"circuits":{"18311311":{"name":"NOT","color":"#8c1e7e","position":[0.5824782951854776,0.4901853015075377],"inputLabels":["A"],"outputLabels":["B"],"inputValues":[false],"outputValues":[true],"links":[],"type":2,"representation":null},"59937316":{"name":"AND","color":"#9d6a67","position":[0.409629044988161,0.49897927135678394],"inputLabels":["A","B"],"outputLabels":["C"],"inputValues":[false,false],"outputValues":[false],"links":[{"circuit":"18311311","input":0,"output":0}],"type":0,"representation":null}},"inputNodes":{"622016":{"state":false,"links":[{"circuit":"59937316","input":null,"output":1}],"position":0.5241048994974874,"name":"None"},"1213078":{"state":false,"links":[{"circuit":"59937316","input":null,"output":0}],"position":0.4122958542713568,"name":"None"}},"outputNodes":{"35704951":{"state":true,"links":[{"circuit":"18311311","input":0,"output":null}],"position":0.46757223618090454,"name":"None"}},"downloads":4},"NOR":{"circuits":{"17747841":{"name":"NOT","color":"#a71706","position":[0.579321231254933,0.4884264960360886],"inputLabels":["A"],"outputLabels":["B"],"inputValues":[false],"outputValues":[true],"links":[],"type":2,"representation":null},"39668842":{"name":"OR","color":"#f19062","position":[0.3851617995264404,0.49345162166422935],"inputLabels":["A","B"],"outputLabels":["C"],"inputValues":[false,false],"outputValues":[false],"links":[{"circuit":"17747841","input":0,"output":0}],"type":1,"representation":null}},"inputNodes":{"5897679":{"state":false,"links":[{"circuit":"39668842","input":null,"output":1}],"position":0.5437028779456364,"name":"None"},"14239075":{"state":false,"links":[{"circuit":"39668842","input":null,"output":0}],"position":0.4218435814632243,"name":"None"}},"outputNodes":{"93963264":{"state":true,"links":[{"circuit":"17747841","input":0,"output":null}],"position":0.490939058850159,"name":"None"}},"downloads":6}}`,
        "secrets/circuits/thomas2.json": `{}`
    };

    beforeEach(() => {
        require("fs").__setMockFiles(MOCK_FILE_INFO);
    });

    test("gets all user circuits successfully", () => {
        return request(app.app).get("/getUser?username=thomas").send().expect(200).expect("Content-type", /json/);
    });

    test("fails when given user that doesn't exist", () => {
        return request(app.app).get("/getUser?username=foo").send().expect(404).expect("Content-type", /json/);
    });

    test("fails when user has no circuits", () => {
        return request(app.app).get("/getUser?username=thomas2").send().expect(404).expect("Content-type", /json/);
    });
});

describe("GET /getCircuit", () => {
    const MOCK_FILE_INFO = {
        "secrets/database.json": `{"thomas":{
            "totalDownloads": 8
        }, "thomas2": {"totalDownloads": 13}}`,
        "secrets/circuits/thomas.json": `{"NAND":{"circuits":{"18311311":{"name":"NOT","color":"#8c1e7e","position":[0.5824782951854776,0.4901853015075377],"inputLabels":["A"],"outputLabels":["B"],"inputValues":[false],"outputValues":[true],"links":[],"type":2,"representation":null},"59937316":{"name":"AND","color":"#9d6a67","position":[0.409629044988161,0.49897927135678394],"inputLabels":["A","B"],"outputLabels":["C"],"inputValues":[false,false],"outputValues":[false],"links":[{"circuit":"18311311","input":0,"output":0}],"type":0,"representation":null}},"inputNodes":{"622016":{"state":false,"links":[{"circuit":"59937316","input":null,"output":1}],"position":0.5241048994974874,"name":"None"},"1213078":{"state":false,"links":[{"circuit":"59937316","input":null,"output":0}],"position":0.4122958542713568,"name":"None"}},"outputNodes":{"35704951":{"state":true,"links":[{"circuit":"18311311","input":0,"output":null}],"position":0.46757223618090454,"name":"None"}},"downloads":4},"NOR":{"circuits":{"17747841":{"name":"NOT","color":"#a71706","position":[0.579321231254933,0.4884264960360886],"inputLabels":["A"],"outputLabels":["B"],"inputValues":[false],"outputValues":[true],"links":[],"type":2,"representation":null},"39668842":{"name":"OR","color":"#f19062","position":[0.3851617995264404,0.49345162166422935],"inputLabels":["A","B"],"outputLabels":["C"],"inputValues":[false,false],"outputValues":[false],"links":[{"circuit":"17747841","input":0,"output":0}],"type":1,"representation":null}},"inputNodes":{"5897679":{"state":false,"links":[{"circuit":"39668842","input":null,"output":1}],"position":0.5437028779456364,"name":"None"},"14239075":{"state":false,"links":[{"circuit":"39668842","input":null,"output":0}],"position":0.4218435814632243,"name":"None"}},"outputNodes":{"93963264":{"state":true,"links":[{"circuit":"17747841","input":0,"output":null}],"position":0.490939058850159,"name":"None"}},"downloads":6}}`
    };

    beforeEach(() => {
        require("fs").__setMockFiles(MOCK_FILE_INFO);
    });

    test("gets circuit successfully", () => {
        return request(app.app).get("/getCircuit?username=thomas&circuitName=NAND").send().expect(200).expect("Content-type", /json/);
    });
    
    test("fails when given circuit that doesn't exist", () => {
        return request(app.app).get("/getCircuit?username=thomas&circuitName=fooCircuit").send().expect(404).expect("Content-type", /json/);
    });

    test("fails when given user that doesn't exist", () => {
        return request(app.app).get("/getCircuit?username=foo&circuitName=fooCircuit").send().expect(404).expect("Content-type", /json/);
    });
});

describe("GET /getCircuits", () => {
    const MOCK_FILE_INFO = {
        "secrets/database.json": `{"thomas":{
            "totalDownloads": 8
        }, "thomas2": {"totalDownloads": 13}}`,
        "secrets/circuits/thomas.json": `{"NAND":{"circuits":{"18311311":{"name":"NOT","color":"#8c1e7e","position":[0.5824782951854776,0.4901853015075377],"inputLabels":["A"],"outputLabels":["B"],"inputValues":[false],"outputValues":[true],"links":[],"type":2,"representation":null},"59937316":{"name":"AND","color":"#9d6a67","position":[0.409629044988161,0.49897927135678394],"inputLabels":["A","B"],"outputLabels":["C"],"inputValues":[false,false],"outputValues":[false],"links":[{"circuit":"18311311","input":0,"output":0}],"type":0,"representation":null}},"inputNodes":{"622016":{"state":false,"links":[{"circuit":"59937316","input":null,"output":1}],"position":0.5241048994974874,"name":"None"},"1213078":{"state":false,"links":[{"circuit":"59937316","input":null,"output":0}],"position":0.4122958542713568,"name":"None"}},"outputNodes":{"35704951":{"state":true,"links":[{"circuit":"18311311","input":0,"output":null}],"position":0.46757223618090454,"name":"None"}},"downloads":4},"NOR":{"circuits":{"17747841":{"name":"NOT","color":"#a71706","position":[0.579321231254933,0.4884264960360886],"inputLabels":["A"],"outputLabels":["B"],"inputValues":[false],"outputValues":[true],"links":[],"type":2,"representation":null},"39668842":{"name":"OR","color":"#f19062","position":[0.3851617995264404,0.49345162166422935],"inputLabels":["A","B"],"outputLabels":["C"],"inputValues":[false,false],"outputValues":[false],"links":[{"circuit":"17747841","input":0,"output":0}],"type":1,"representation":null}},"inputNodes":{"5897679":{"state":false,"links":[{"circuit":"39668842","input":null,"output":1}],"position":0.5437028779456364,"name":"None"},"14239075":{"state":false,"links":[{"circuit":"39668842","input":null,"output":0}],"position":0.4218435814632243,"name":"None"}},"outputNodes":{"93963264":{"state":true,"links":[{"circuit":"17747841","input":0,"output":null}],"position":0.490939058850159,"name":"None"}},"downloads":6}}`,
        "secrets/circuits/thomas2.json": `{}`
    };

    beforeEach(() => {
        require("fs").__setMockFiles(MOCK_FILE_INFO);
    });

    test("gets circuit successfully", () => {
        return request(app.app).get("/getCircuits?username=thomas").send().expect(200).expect("Content-type", /json/);
    });

    test("fails when given invalid username", () => {
        return request(app.app).get("/getCircuits?username=foo").send().expect(404).expect("Content-type", /json/);
    });

    test("fails when user has no saved circuits", () => {
        return request(app.app).get("/getCircuits?username=thomas2").send().expect(404).expect("Content-type", /json/);
    });
});

describe("POST /saveCircuit", () => {
    const MOCK_FILE_INFO = {
        "secrets/database.json": `{"thomas":{
            "sessionToken": "abcd",
            "sessionStart": "${new Date()}",
            "totalDownloads": 8
        }}`,
        "secrets/circuits/thomas.json": `{"NAND":{"circuits":{"18311311":{"name":"NOT","color":"#8c1e7e","position":[0.5824782951854776,0.4901853015075377],"inputLabels":["A"],"outputLabels":["B"],"inputValues":[false],"outputValues":[true],"links":[],"type":2,"representation":null},"59937316":{"name":"AND","color":"#9d6a67","position":[0.409629044988161,0.49897927135678394],"inputLabels":["A","B"],"outputLabels":["C"],"inputValues":[false,false],"outputValues":[false],"links":[{"circuit":"18311311","input":0,"output":0}],"type":0,"representation":null}},"inputNodes":{"622016":{"state":false,"links":[{"circuit":"59937316","input":null,"output":1}],"position":0.5241048994974874,"name":"None"},"1213078":{"state":false,"links":[{"circuit":"59937316","input":null,"output":0}],"position":0.4122958542713568,"name":"None"}},"outputNodes":{"35704951":{"state":true,"links":[{"circuit":"18311311","input":0,"output":null}],"position":0.46757223618090454,"name":"None"}},"downloads":4},"NOR":{"circuits":{"17747841":{"name":"NOT","color":"#a71706","position":[0.579321231254933,0.4884264960360886],"inputLabels":["A"],"outputLabels":["B"],"inputValues":[false],"outputValues":[true],"links":[],"type":2,"representation":null},"39668842":{"name":"OR","color":"#f19062","position":[0.3851617995264404,0.49345162166422935],"inputLabels":["A","B"],"outputLabels":["C"],"inputValues":[false,false],"outputValues":[false],"links":[{"circuit":"17747841","input":0,"output":0}],"type":1,"representation":null}},"inputNodes":{"5897679":{"state":false,"links":[{"circuit":"39668842","input":null,"output":1}],"position":0.5437028779456364,"name":"None"},"14239075":{"state":false,"links":[{"circuit":"39668842","input":null,"output":0}],"position":0.4218435814632243,"name":"None"}},"outputNodes":{"93963264":{"state":true,"links":[{"circuit":"17747841","input":0,"output":null}],"position":0.490939058850159,"name":"None"}},"downloads":6}}`
    };

    beforeEach(() => {
        require("fs").__setMockFiles(MOCK_FILE_INFO);
    });

    test("saves circuit successfully", () => {
        const CIRCUIT_INFO = {
            "username": "thomas",
            "sessionToken": "abcd",
            "sessionStart": `"${new Date()}"`,
            "circuitName": "newCircuit",
            "circuitData": {"circuits": {}, "inputNodes": {}, "outputNodes": {}}
        };

        return request(app.app).post("/saveCircuit").send(CIRCUIT_INFO).expect(200).expect("Content-type", /json/);
    });
});