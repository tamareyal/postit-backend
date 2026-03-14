import request from "supertest";
import { serverURL, comments } from "./mockdata";
import { expressApp, testUser } from "../jest.setup";
import TestUser from "./misc/auth";
import { authenticate, AuthenticatedRequest } from "../middlewares/authMiddleware";
import { Response, NextFunction } from "express";
import CommentsModel from '../models/comments';


describe("Comments API", () => {


    test("Create Comments", async () => {
        for (const commentData of comments) {
            const res = await request(serverURL)
                .post("/api/comments")
                .set("Authorization", `Bearer ${testUser.accessToken}`)
                .send(commentData);
            
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty("sender_id");
            expect(res.body.message).toBe(commentData.message);
            expect(res.body.post_id).toBe(commentData.post_id);
            expect(res.body.sender_id).toBe(testUser.id);

            commentData._id = res.body._id;
            commentData.sender_id = res.body.sender_id;
            commentData.createdAt = res.body.createdAt;
            commentData.updatedAt = res.body.updatedAt;
        }
    });


    test("Get all comments", async () => {
        const res = await request(serverURL)
            .get("/api/comments")
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toEqual(comments.length);
    });

    test("Get Next Page for Comments", async () => {
        const firstPageRes = await request(serverURL)
            .get("/api/comments/page?limit=2")
            .set("Authorization", `Bearer ${testUser.accessToken}`);

        expect(firstPageRes.status).toBe(200);
        expect(Array.isArray(firstPageRes.body.data)).toBe(true);
        expect(firstPageRes.body.data.length).toBeLessThanOrEqual(2);
        expect(firstPageRes.body).toHaveProperty("nextCursor");

        if (firstPageRes.body.nextCursor) {
            const nextPageRes = await request(serverURL)
                .get(`/api/comments/page?limit=2&lastCreatedAt=${encodeURIComponent(firstPageRes.body.nextCursor)}`)
                .set("Authorization", `Bearer ${testUser.accessToken}`);

            expect(nextPageRes.status).toBe(200);
            expect(Array.isArray(nextPageRes.body.data)).toBe(true);
            expect(nextPageRes.body.data.length).toBeLessThanOrEqual(2);

            for (const comment of nextPageRes.body.data) {
                expect(new Date(comment.createdAt).getTime()).toBeLessThan(new Date(firstPageRes.body.nextCursor).getTime());
            }
        }
    });

    test("Get Next Page for Comments with invalid cursor", async () => {
        const res = await request(serverURL)
            .get("/api/comments/page?lastCreatedAt=not-a-date")
            .set("Authorization", `Bearer ${testUser.accessToken}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Invalid lastCreatedAt value");
    });


    test("Get Comment by ID", async () => {
        const commentToGet = comments[0];
        const res = await request(serverURL)
            .get(`/api/comments/${commentToGet._id}`)
            .set("Authorization", `Bearer ${testUser.accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body._id).toBe(commentToGet._id);
        expect(res.body.message).toBe(commentToGet.message);
        expect(res.body.post_id).toBe(commentToGet.post_id);
        expect(res.body.sender_id).toBe(commentToGet.sender_id);
    });


    test("Get Comments by Post ID", async () => {
        const postId = comments[1].post_id;
        const res = await request(serverURL)
            .get(`/api/comments/posts/${postId}`)
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        const expectedComments = comments.filter(c => c.post_id === postId);
        expect(res.body.length).toBe(expectedComments.length);
    });


    test("Update a Comment", async () => {
        const commentToUpdate = comments[0];
        const updatedMessage = {
            message: "This is the updated message of the first comment."
        };
        
        const res = await request(serverURL)
            .put(`/api/comments/${commentToUpdate._id}`)
            .set("Authorization", `Bearer ${testUser.accessToken}`)
            .send(updatedMessage);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe(updatedMessage.message);

        comments[0].message = res.body.message;
    });


    test("Delete a Comment", async () => {
        const commentToDelete = comments[1];
        const res = await request(serverURL)
            .delete(`/api/comments/${commentToDelete._id}`)
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        
        expect(res.status).toBe(200);
        
        // Verify deletion
        const getRes = await request(serverURL)
            .get(`/api/comments/${commentToDelete._id}`)
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        
        expect(getRes.status).toBe(404);
    });


    test("Create Comment without Authentication", async () => {
        const commentData = comments[2];
        const res = await request(serverURL)
            .post("/api/comments")
            .send(commentData);
        
        expect(res.status).toBe(401);
    });

    test("Create Comment with sender_id in body", async () => {
        const commentData = {
            ...comments[2],
            sender_id: "someotherid"
        };
        const res = await request(serverURL)
            .post("/api/comments")
            .set("Authorization", `Bearer ${testUser.accessToken}`)
            .send(commentData);
        
        expect(res.status).toBe(400);
    });

    test("Get Comments with invalid Post ID", async () => {
        const invalidPostId = "12345";
        const res = await request(serverURL)
            .get(`/api/comments/posts/${invalidPostId}`)
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        
        expect(res.status).toBe(400);
    });


    test("Attempt to Delete a Comment as another User", async () => {
        const tempUser = new TestUser(
            "tempuser",
            "tempuser@example.com",
            "tempPassword123"
        );
        await tempUser.registerUser(serverURL);

        const commentToDelete = comments[0];
        
        const res = await request(expressApp)
            .delete(`/api/comments/${commentToDelete._id}`)
            .set("Authorization", `Bearer ${tempUser.accessToken}`);
        
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Forbidden: unable to perform operation on resource not owned by you");
    });

    test("Attempt to update with a different user", async () => {
        const tempUser = new TestUser(
            "tempuser2",
            "tempuser2@example.com",
            "tempPassword123"
        );
        await tempUser.registerUser(serverURL);

        const res = await request(serverURL)
            .put(`/api/comments/${comments[0]._id}`)
            .set("Authorization", `Bearer ${tempUser.accessToken}`)
            .send({ message: "Trying to update another user's comment" });
        
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Forbidden: unable to perform operation on resource not owned by you");
    });

    test("Attempt to update with invalid token", async () => {
        const res = await request(expressApp)
            .put(`/api/comments/${comments[0]._id}`)
            .set("Authorization", `Bearer invalidtoken123`)
            .send({ message: "Trying to update with invalid token" });
        
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Invalid token");
    });


    test("Attempt to delete a non-existent Comment", async () => {
        const nonExistentCommentId = "64b7f8f8f8f8f8f8f8f8f8f8"; // Assuming this ID does not exist
        const res = await request(expressApp)
            .delete(`/api/comments/${nonExistentCommentId}`)
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        
        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Resource not found");
    });


    test("Create Comment missing required fields", async () => {
        const res = await request(serverURL)
            .post("/api/comments")
            .set("Authorization", `Bearer ${testUser.accessToken}`)
            .send({}); // missing message and post_id

        expect(res.status).toBe(400);
    });

    test("Create Comment with invalid post_id format", async () => {
        const res = await request(serverURL)
            .post("/api/comments")
            .set("Authorization", `Bearer ${testUser.accessToken}`)
            .send({ message: "Hi", post_id: "invalid-id" });

        expect(res.status).toBe(500);
    });


    test("Create Comment -> returns 500 when DB errors", async () => {
        const commentData = {
            message: "DB Error Comment",
            post_id: "invalid_id_format" // Invalid ObjectId format
        };
        const res = await request(serverURL)
            .post("/api/comments")
            .set("Authorization", `Bearer ${testUser.accessToken}`)
            .send(commentData);
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("message");
    });


    test("Get all comments -> returns 500 when DB errors", async () => {
        // Use invalid ObjectId in query to trigger DB error
        const res = await request(serverURL)
            .get("/api/comments?_id=invalid_id_format")
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("message");
    });

    test("Get Comment by ID -> returns 500 when DB errors", async () => {
        const res = await request(serverURL)
            .get("/api/comments/invalid_id_format")
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("message");
    });

    test("Get Comments by Post ID -> returns 500 when DB errors", async () => {
        const findSpy = jest.spyOn(CommentsModel, 'find').mockRejectedValueOnce(new Error('Database error'));

        const validObjectId = '507f1f77bcf86cd799439011';
        const res = await request(expressApp)
            .get(`/api/comments/posts/${validObjectId}`)
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("message");
        
        findSpy.mockRestore();
    });

    test("Update comment -> returns 500 when DB errors", async () => {
        // Use invalid ObjectId format
        const res = await request(serverURL)
            .put("/api/comments/invalid_id_format")
            .set("Authorization", `Bearer ${testUser.accessToken}`)
            .send({ message: "won't save" });
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("message");
    });


    test("Delete comment -> returns 500 when DB errors", async () => {
        // Use invalid ObjectId format
        const res = await request(serverURL)
            .delete("/api/comments/invalid_id_format")
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("message");
    });

    test('returns 401 when Authorization header is missing',async () => {
        const req = {
        headers: {},
        } as AuthenticatedRequest;

        const res = {} as Response;
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);

        const mockNext = jest.fn() as NextFunction

        authenticate(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Authorization header missing' });
        expect(mockNext).not.toHaveBeenCalled();
    });
    
});