import request from "supertest";
import { serverURL } from "./mockdata";
import { testUser } from "../jest.setup";
import TestUser from "./misc/auth";
import mongoose from "mongoose";

describe("Users API", () => {
    test("Get All Users", async () => {
        const res = await request(serverURL)
            .get("/api/users")
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    test("Get Next Page for Users", async () => {
        const timestamp = Date.now();
        const pageUser1 = new TestUser(
            `page_user_${timestamp}_1`,
            `page_user_${timestamp}_1@example.com`,
            "tempPassword123"
        );
        const pageUser2 = new TestUser(
            `page_user_${timestamp}_2`,
            `page_user_${timestamp}_2@example.com`,
            "tempPassword123"
        );

        await pageUser1.registerUser(serverURL);
        await pageUser2.registerUser(serverURL);

        const firstPageRes = await request(serverURL)
            .get("/api/users/page?limit=2")
            .set("Authorization", `Bearer ${testUser.accessToken}`);

        expect(firstPageRes.status).toBe(200);
        expect(Array.isArray(firstPageRes.body.data)).toBe(true);
        expect(firstPageRes.body.data.length).toBeLessThanOrEqual(2);
        expect(firstPageRes.body).toHaveProperty("nextCursor");

        if (firstPageRes.body.nextCursor) {
            const nextPageRes = await request(serverURL)
                .get(`/api/users/page?limit=2&lastCreatedAt=${encodeURIComponent(firstPageRes.body.nextCursor)}`)
                .set("Authorization", `Bearer ${testUser.accessToken}`);

            expect(nextPageRes.status).toBe(200);
            expect(Array.isArray(nextPageRes.body.data)).toBe(true);
            expect(nextPageRes.body.data.length).toBeLessThanOrEqual(2);

            for (const user of nextPageRes.body.data) {
                expect(new Date(user.createdAt).getTime()).toBeLessThan(new Date(firstPageRes.body.nextCursor).getTime());
            }
        }
    });

    test("Get Next Page for Users with invalid cursor", async () => {
        const res = await request(serverURL)
            .get("/api/users/page?lastCreatedAt=not-a-date")
            .set("Authorization", `Bearer ${testUser.accessToken}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Invalid lastCreatedAt value");
    });

    test("Get User by ID", async () => {
        const res = await request(serverURL)
            .get(`/api/users/${testUser.id}`)
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("_id", testUser.id);
        expect(res.body).toHaveProperty("name", testUser.username);
        expect(res.body).toHaveProperty("email", testUser.email);
    });

    test("Update User and Expect Successful Login", async () => {
        const tempUser = new TestUser(
            "tempUser",
            "tempuser@example.com",
            "tempPassword123"
        );
        await tempUser.registerUser(serverURL);
        expect(tempUser.id).toBeDefined();

        const updatedData = {
            name: "UpdatedTester",
            email: "updatedtester@example.com",
            password: "newSecurePassword456"
        };

        const res = await request(serverURL)
            .put(`/api/users/${tempUser.id}`)
            .set("Authorization", `Bearer ${tempUser.accessToken}`)
            .send(updatedData);
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("_id", tempUser.id);
        expect(res.body).toHaveProperty("name", updatedData.name);
        expect(res.body).toHaveProperty("email", updatedData.email);

        const loginRes = await request(serverURL)
            .post("/api/auth/login")
            .send({
                email: updatedData.email,
                password: updatedData.password
            });
        
        expect(loginRes.status).toBe(200);
        expect(loginRes.body).toHaveProperty("token");
        expect(loginRes.body).toHaveProperty("refreshToken");
    });

    test("Update non existing user", async () => {
        const tempUser = new TestUser(
            "tempUser",
            "tempuser@example.com",
            "tempPassword123"
        );
        await tempUser.registerUser(serverURL);
        expect(tempUser.id).toBeDefined();

        const updatedData = {
            name: "UpdatedTester",
            email: "updatedtester@example.com",
            password: "newSecurePassword456"
        };

        const nonExistingId = new mongoose.Types.ObjectId().toHexString();

        const res = await request(serverURL)
            .put(`/api/users/${nonExistingId}`)
            .set("Authorization", `Bearer ${tempUser.accessToken}`)
            .send(updatedData);
        
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "Resource not found");
    });


    test("Update user with invalid ID", async () => {
        const tempUser = new TestUser(
            "tempUser2",
            "tempuser2@example.com",
            "tempPassword123"
        );
        const reg = await tempUser.registerUser(serverURL);
        expect(tempUser.id).toBeDefined();

        const updatedData = {
            name: "UpdatedTester",
            email: "updatedtester@example.com",
            password: "newSecurePassword456"
        };

        const res = await request(serverURL)
            .put(`/api/users/123`)
            .set("Authorization", `Bearer ${tempUser.accessToken}`)
            .send(updatedData);
        
        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Cast to ObjectId failed for value \"123\" (type string) at path \"_id\" for model \"Users\"");
    });



    test("Delete User", async () => {
        const tempUser = new TestUser(
            "deleteUser",
            "deleteuser@example.com",
            "deletePassword123"
        );
        await tempUser.registerUser(serverURL);
        expect(tempUser.id).toBeDefined();

        const res = await request(serverURL)
            .delete(`/api/users/${tempUser.id}`)
            .set("Authorization", `Bearer ${tempUser.accessToken}`);
        
        expect(res.status).toBe(200);

        const getRes = await request(serverURL)
            .get(`/api/users/${tempUser.id}`)
            .set("Authorization", `Bearer ${tempUser.accessToken}`);
        
        expect(getRes.status).toBe(404);
    });

    
});