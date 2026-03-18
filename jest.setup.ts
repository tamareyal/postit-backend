require('dotenv').config({ path: '.env.test' });

import mongoose from "mongoose";
import startServer from "./index";
import TestUser from "./tests/misc/auth";
import { serverURL } from "./tests/mockdata";
import { Express } from "express";

const PORT = Number(process.env.PORT) || 3000;
const MONGO_URI = process.env.MONGO_MOCK_URI || "mongodb://localhost:27017/mockdatabase";
// Create TestUser for authenticated interaction with the server
const testUser = new TestUser(
    "Tester", 
    "tester@example.com",
    "securePassword123"
);
let expressApp: Express = null as any;


jest.setTimeout(120000); 

beforeAll(async () => {
    // Start testing server
    const [conn, app] = await startServer(PORT, MONGO_URI);
    expressApp = app;
    expressApp.listen(PORT, () => {});
    // Clear database before running tests
    if (conn) {
        await clearDatabase(conn);
    }
}, 120000);

beforeAll(async () => {
    await testUser.registerUser(serverURL);
    expect(testUser.id).toBeDefined();
    expect(testUser.accessToken).toBeDefined();
});

beforeEach(async () => {
    const oldAccessToken = testUser.accessToken;
    await testUser.refreshTokens(serverURL);
    expect(testUser.accessToken).not.toBe(oldAccessToken);
});

async function clearDatabase(connection: mongoose.Connection) {
    const collections = await connection.db?.collections();
    if (collections) {
        for (const collection of collections) {
            await collection.deleteMany({});
        }
    }
}

export { testUser, expressApp };

