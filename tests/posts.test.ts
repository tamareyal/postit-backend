import request from "supertest";
import { serverURL, posts } from "./mockdata";
import { testUser, expressApp } from "../jest.setup";
import TestUser from "./misc/auth";


describe("Posts API", () => {
    test("Create Posts", async () => {
        for (const postData of posts) {
            const res = await request(expressApp)
                .post("/api/posts")
                .set("Authorization", `Bearer ${testUser.accessToken}`)
                .send(postData);
            
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty("sender_id");
            expect(res.body.title).toBe(postData.title);
            expect(res.body.content).toBe(postData.content);
            expect(res.body.sender_id).toBe(testUser.id);

            postData._id = res.body._id;
            postData.sender_id = res.body.sender_id;
            postData.createdAt = res.body.createdAt;
            postData.updatedAt = res.body.updatedAt;
        }
    });

    test("Get All Posts", async () => {
        const res = await request(serverURL)
            .get("/api/posts")
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        
        expect(res.status).toBe(200);
        
        for (let i = 0; i < posts.length; i++) {
            expect(res.body[i]._id).toBe(posts[i]._id);
            expect(res.body[i].title).toBe(posts[i].title);
            expect(res.body[i].content).toBe(posts[i].content);
            expect(res.body[i].sender_id).toBe(posts[i].sender_id);
        }
    });

    test("Get Next Page for Posts", async () => {
        const firstPageRes = await request(serverURL)
            .get("/api/posts/page?limit=2")
            .set("Authorization", `Bearer ${testUser.accessToken}`);

        expect(firstPageRes.status).toBe(200);
        expect(Array.isArray(firstPageRes.body.data)).toBe(true);
        expect(firstPageRes.body.data.length).toBeLessThanOrEqual(2);
        expect(firstPageRes.body).toHaveProperty("nextCursor");

        if (firstPageRes.body.nextCursor) {
            const nextPageRes = await request(serverURL)
                .get(`/api/posts/page?limit=2&lastCreatedAt=${encodeURIComponent(firstPageRes.body.nextCursor)}`)
                .set("Authorization", `Bearer ${testUser.accessToken}`);

            expect(nextPageRes.status).toBe(200);
            expect(Array.isArray(nextPageRes.body.data)).toBe(true);
            expect(nextPageRes.body.data.length).toBeLessThanOrEqual(2);

            for (const post of nextPageRes.body.data) {
                expect(new Date(post.createdAt).getTime()).toBeLessThan(new Date(firstPageRes.body.nextCursor).getTime());
            }
        }
    });

    test("Get Next Page for Posts with invalid cursor", async () => {
        const res = await request(serverURL)
            .get("/api/posts/page?lastCreatedAt=not-a-date")
            .set("Authorization", `Bearer ${testUser.accessToken}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Invalid lastCreatedAt value");
    });

    test("Get Post by ID", async () => {
        const postToGet = posts[1];
        const res = await request(serverURL)
            .get(`/api/posts/${postToGet._id}`)
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body._id).toBe(postToGet._id);
        expect(res.body.title).toBe(postToGet.title);
        expect(res.body.content).toBe(postToGet.content);
        expect(res.body.sender_id).toBe(postToGet.sender_id);
    });

    test("Update a Post", async () => {
        const postToUpdate = posts[0];
        const updatedContent = {
            title: "Updated First Post",
            content: "This is the updated content of the first post."
        };
        
        const res = await request(serverURL)
            .put(`/api/posts/${postToUpdate._id}`)
            .set("Authorization", `Bearer ${testUser.accessToken}`)
            .send(updatedContent);

        expect(res.status).toBe(200);
        expect(res.body.title).toBe(updatedContent.title);
        expect(res.body.content).toBe(updatedContent.content);

        posts[0].title = res.body.title;
        posts[0].content = res.body.content;
        posts[0].updatedAt = res.body.updatedAt;
    });

    test("Delete a Post", async () => {
        const postToDelete = posts[2];
        
        const res = await request(expressApp)
            .delete(`/api/posts/${postToDelete._id}`)
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        
        expect(res.status).toBe(200);
        
        const getRes = await request(expressApp)
            .get(`/api/posts/${postToDelete._id}`)
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        
        expect(getRes.status).toBe(404);
        expect(getRes.body.message).toBe("Resource not found");
    });

    test("Create Post without Authentication", async () => {
        const postData = {
            title: "Unauthorized Post",
            content: "This post should not be created."
        };
        
        const res = await request(serverURL)
            .post("/api/posts")
            .send(postData);

        expect(res.status).toBe(401);
    });

    test("Create Post with sender_id in Body should not work", async () => {
        const postData = {
            title: "Invalid Post",
            content: "This post has sender_id set.",
            sender_id: "someuserid"
        };
        
        const res = await request(serverURL)
            .post("/api/posts")
            .set("Authorization", `Bearer ${testUser.accessToken}`)
            .send(postData);

        expect(res.status).toBe(400);
    });

    test("Attempt to Delete a Post as another User", async () => {
        const tempUser = new TestUser(
            "tempuser",
            "tempuser@example.com",
            "tempPassword123"
        );
        await tempUser.registerUser(serverURL);

        const postToDelete = posts[0];
        
        const res = await request(expressApp)
            .delete(`/api/posts/${postToDelete._id}`)
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
            .put(`/api/posts/${posts[0]._id}`)
            .set("Authorization", `Bearer ${tempUser.accessToken}`)
            .send({ title: "Trying to update another user's post", content: "Trying to update another user's post content" });
        
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Forbidden: unable to perform operation on resource not owned by you");
    });

    test("Get Non-Existent Post", async () => {
        const nonExistentPostId = "64b7f8f8f8f8f8f8f8f8f8f8";
        
        const res = await request(serverURL)
            .get(`/api/posts/${nonExistentPostId}`)
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        
        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Resource not found");
    });

    test("Create Post -> returns 500 when DB errors", async () => {
        const postData = {
            _id: "invalid_id_format",
            title: "DB Error Post",
            content: "This post should trigger a DB error."
        };
        const res = await request(serverURL)
            .post("/api/posts")
            .set("Authorization", `Bearer ${testUser.accessToken}`)
            .send(postData);
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("message");
    });


    test("Get all posts -> returns 500 when DB errors", async () => {
        // Use an invalid ObjectId in query filter to trigger DB error
        const res = await request(serverURL)
            .get("/api/posts?_id=invalid_id_format")
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("message");
    });


    test("Update posts -> returns 500 when DB errors", async () => {
        // Use invalid ObjectId format to trigger cast error
        const res = await request(expressApp)
            .put("/api/posts/invalid_id_format")
            .set("Authorization", `Bearer ${testUser.accessToken}`)
            .send({ title: "won't save", content: "won't save" });
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("message");
    });


    test("Delete post -> returns 500 when DB errors", async () => {
        // Use invalid ObjectId format to trigger cast error
        const res = await request(expressApp)
            .delete("/api/posts/invalid_id_format")
            .set("Authorization", `Bearer ${testUser.accessToken}`);
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("message");
    });

    test("Create Post with no Title", async () => {
        const postData = {
            content: "This post has no title."
        };
        
        const res = await request(serverURL)
            .post("/api/posts")
            .set("Authorization", `Bearer ${testUser.accessToken}`)
            .send(postData);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message");
    });

    test("Create Post with no Content", async () => {
        const postData = {
            title: "Title Only Post"
        };
        
        const res = await request(serverURL)
            .post("/api/posts")
            .set("Authorization", `Bearer ${testUser.accessToken}`)
            .send(postData);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message");
    });
  
    test("Attempt to update with invalid token", async () => {
        const res = await request(expressApp)
            .put(`/api/posts/${posts[0]._id}`)
            .set("Authorization", `Bearer invalidtoken123`)
            .send({ title: "Trying to update with invalid token", content: "Trying to update with invalid token content" });
        
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Invalid token");
    });
});