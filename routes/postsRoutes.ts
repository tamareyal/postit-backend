import { Router } from "express";
import postsController from "../controllers/postsController";
import { authenticate, authorizeOwner } from '../middlewares/authMiddleware';
import PostsModel from "../models/posts";

const router = Router();

// Route to get all posts - accepts filtering parameters via query string
/**
 * @swagger
 * /api/posts:
 *   get:
 *     tags:
 *       - Posts
 *     summary: Retrieve a list of posts
 *     description: Retrieve a list of posts. Can be filtered by query parameters.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of posts.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       401:
 *         description: Unauthorized
 */
router.get("/", authenticate, postsController.getAll);

// Route to create a new post
/**
 * @swagger
 * /api/posts:
 *   post:
 *     tags:
 *       - Posts
 *     summary: Create a new post
 *     description: Create a new post. The sender_id is set automatically based on the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Post created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */

// Route to search posts using free-text parsed by the LLM service
/**
 * @swagger
 * /api/posts/search:
 *   post:
 *     tags:
 *       - Posts
 *     summary: Search posts using free-text
 *     description: Accepts a natural-language search query, converts it into a MongoDB filter via the configured LLM service, sanitizes the filter, and returns matching posts.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of comments to return (max 100). Triggers paged mode when provided.
 *       - in: query
 *         name: lastCreatedAt
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Cursor for pagination. For a new session it limits results to comments created before this timestamp.
 *       - in: query
 *         name: queryHash
 *         schema:
 *           type: string
 *         description: Existing pagination session hash to continue.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Natural-language description of the desired posts.
 *     responses:
 *       200:
 *         description: Matching posts.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 nextCursor:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 mongoFilter:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Invalid search request
 *       401:
 *         description: Unauthorized
 *       503:
 *         description: Search service unavailable
 */
router.post("/search", authenticate, postsController.search);

router.post("/", authenticate, postsController.create);

// Route to get a paginated list of posts using cursor-based pagination
/**
 * @swagger
 * /api/posts/page:
 *   get:
 *     tags:
 *       - Posts
 *     summary: Retrieve the next page of posts
 *     description: Returns a batch of posts sorted by creation date descending. Pass `lastCreatedAt` from the previous response as a cursor to retrieve the next page.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of posts to return (max 100).
 *       - in: query
 *         name: lastCreatedAt
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO date cursor from the previous page's `nextCursor` field.
 *     responses:
 *       200:
 *         description: A page of posts with a cursor for the next page.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 nextCursor:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                   description: Pass this value as `lastCreatedAt` to retrieve the next page. Null when there are no more pages.
 *       400:
 *         description: Invalid lastCreatedAt value
 *       401:
 *         description: Unauthorized
 */
router.get("/page", authenticate, postsController.getNextPage);

// Route to get posts by user ID (for profile page)
/**
 * @swagger
 * /api/posts/users/{userId}:
 *   get:
 *     tags:
 *       - Posts
 *     summary: Get posts by user ID
 *     description: Returns a paginated list of posts created by the specified user, sorted by creation date descending. Use for profile pages.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user's ID.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of posts to return (max 100).
 *       - in: query
 *         name: lastCreatedAt
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Cursor for pagination. Pass the previous response's nextCursor to get the next page.
 *     responses:
 *       200:
 *         description: A page of posts by the user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 nextCursor:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 queryHash:
 *                   type: string
 *       400:
 *         description: Invalid lastCreatedAt value
 *       401:
 *         description: Unauthorized
 */
router.get("/users/:userId", authenticate, postsController.getByUserId);

// Route to get a specific post by ID
/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     tags:
 *       - Posts
 *     summary: Retrieve a specific post by ID
 *     description: Retrieve a specific post by its ID.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID.
 *     responses:
 *       200:
 *         description: A single post.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
router.get("/:id", authenticate, postsController.getById);

// Route to update a specific post by ID
/**
 * @swagger
 * /api/posts/{id}:
 *   put:
 *     tags:
 *       - Posts
 *     summary: Update a specific post by ID
 *     description: Update a specific post by its ID. Only the owner of the post can update it.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Post updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 */
router.put("/:id", authenticate, authorizeOwner(PostsModel, post => post.sender_id.toString()), postsController.update);

// Route to delete a specific post by ID
/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     tags:
 *       - Posts
 *     summary: Delete a specific post by ID
 *     description: Delete a specific post by its ID. Only the owner of the post can delete it.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID.
 *     responses:
 *       200:
 *         description: Post deleted successfully.
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 */
router.delete("/:id", authenticate, authorizeOwner(PostsModel, post => post.sender_id.toString()), postsController.delete);

// Route to toggle like on a specific post by ID
/**
 * @swagger
 * /api/posts/{id}/like:
 *   put:
 *     tags:
 *       - Posts
 *     summary: Toggle like on a post
 *     description: Adds a like if the authenticated user has not liked the post yet, or removes it if they have. Returns the new like count.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID.
 *     responses:
 *       200:
 *         description: Like toggled successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 likes:
 *                   type: integer
 *                   description: The new total number of likes.
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
router.put("/:id/like", authenticate, postsController.like);

export default router;