const request = require("supertest");

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
        return mockFiles[path] || [];
    }

    function writeFileSync(path, data) {
        mockFiles[path] = data;
    }

    function existsSync(path) {
        return path in mockFiles;
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
describe("Test responseJSON functionality", () => {
    test("returns json", () => {
        expect(app.responseJSON("")).toBeInstanceOf(Object);
    });

    test("has field response", () => {
        expect(app.responseJSON("")).toHaveProperty("response", "");
    });
});

describe("Test create account", () => {
    const MOCK_FILE_INFO = {
        "secrets/database.json": `{"existing":{
            "password": "$2b$10$DVibo4zGrhpXtBQ6czkmQeRTQqZMSQpQEZKyKQltXXIvvTAVj61ny",
            "sessionToken": "3c38504bb671e283d7df62ba5dc37a06465b3c045f989d83da12b2848de1b8fd4f77fe3cc5f06369c1589cd76861db806d22412fdb9e29e0fd5481cb198cb10a",
            "sessionStart": "2023-12-29T12:54:55.018Z",
            "totalDownloads": 8
        }}`
    };

    require("fs").__setMockFiles(MOCK_FILE_INFO);

    test("account can be created", () => {
        const ACCOUNT_DATA = {
            "username": "valid",
            "password": "<script>cool password</script>"
        };

        return request(app.app).post("/createAccount").send(ACCOUNT_DATA).expect(200);
    });

    test("account with dangerous details is rejected", () => {
        const ACCOUNT_DATA = {
            "username": "../database.json",
            "password": "password123"
        };

        return request(app.app).post("/createAccount").send(ACCOUNT_DATA).expect(400);
    });

    test("existing username cannot be used", () => {
        const ACCOUNT_DATA = {
            "username": "existing",
            "password": "password123"
        };

        return request(app.app).post("/createAccount").send(ACCOUNT_DATA).expect(400);
    });
});

describe("Test login", () => {
    const MOCK_FILE_INFO = {
        "secrets/database.json": `{"thomas":{
            "password": "$2b$10$DVibo4zGrhpXtBQ6czkmQeRTQqZMSQpQEZKyKQltXXIvvTAVj61ny",
            "sessionToken": "3c38504bb671e283d7df62ba5dc37a06465b3c045f989d83da12b2848de1b8fd4f77fe3cc5f06369c1589cd76861db806d22412fdb9e29e0fd5481cb198cb10a",
            "sessionStart": "2023-12-29T12:54:55.018Z",
            "totalDownloads": 8
        }}`
    };

    require("fs").__setMockFiles(MOCK_FILE_INFO);

    test("account with correct password logged into", () => {
        const ACCOUNT_DATA = {
            "username": "thomas",
            "password": "password"
        };

        return request(app.app).post("/login").send(ACCOUNT_DATA).expect(200);
    });
});