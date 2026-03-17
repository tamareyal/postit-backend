import { Router } from "express";
import commentsController from "../controllers/commentsController";
import { authenticate, authorizeOwner} from '../middlewares/authMiddleware';
import CommentsModel from "../models/comments";

const router = Router();

// Route to get all comments - accepts filtering parameters via query string
/**
 * @swagger
 * /api/comments:
 *   get:
 *     tags:
 *       - Comments
 *     summary: Retrieve a list of comments
 *     description: Retrieve a list of comments. Can be filtered by query parameters.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of comments.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 *       401:
 *         description: Unauthorized
 */
router.get("/", authenticate, commentsController.getAll);

// Route to create a new comment
/**
 * @swagger
 * /api/comments:
 *   post:
 *     tags:
 *       - Comments
 *     summary: Create a new comment
 *     description: Create a new comment. The sender_id is set automatically based on the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               post_id:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/", authenticate, commentsController.create);

// Route to get a paginated list of comments using cursor-based pagination
/**
 * @swagger
 * /api/comments/page:
 *   get:
 *     tags:
 *       - Comments
 *     summary: Retrieve the next page of comments
 *     description: Returns a batch of comments sorted by creation date descending. Pass `lastCreatedAt` from the previous response as a cursor to retrieve the next page.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of comments to return (max 100).
 *       - in: query
 *         name: lastCreatedAt
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO date cursor from the previous page's `nextCursor` field.
 *     responses:
 *       200:
 *         description: A page of comments with a cursor for the next page.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
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
router.get("/page", authenticate, commentsController.getNextPage);

// Route to get a specific comment by ID
/**
 * @swagger
 * /api/comments/{id}:
 *   get:
 *     tags:
 *       - Comments
 *     summary: Retrieve a specific comment by ID
 *     description: Retrieve a specific comment by its ID.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The comment ID.
 *     responses:
 *       200:
 *         description: A single comment.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */  
router.get("/:id", authenticate, commentsController.getById);

// Route to get a specific comment by post ID
/**
 * @swagger
 * /api/comments/posts/{postId}:
 *   get:
 *     tags:
 *       - Comments
 *     summary: Retrieve comments for a specific post by post ID
 *     description: |
 *       Retrieve comments associated with a specific post by its ID.
 *       If at least one pagination query parameter is supplied (`limit`, `lastCreatedAt`, `queryHash`, or `hash`),
 *       the endpoint returns a paged response and starts/continues a query session using `queryHash`.
 *       Without pagination query parameters, the endpoint returns the full comments list for the post.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID.
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
 *       - in: query
 *         name: hash
 *         schema:
 *           type: string
 *         description: Alias of `queryHash` for continuing an existing pagination session.
 *     responses:
 *       200:
 *         description: Either a full list of comments (no pagination params) or a paged response (when pagination params are provided).
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Comment'
 *                     nextCursor:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     queryHash:
 *                       type: string
 *       400:
 *         description: Invalid postId, queryHash, or lastCreatedAt value
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
router.get("/posts/:postId", authenticate, commentsController.getByPostId);

// Route to update a specific comment by ID
/**
 * @swagger
 * /api/comments/{id}:
 *   put:
 *     tags:
 *       - Comments
 *     summary: Update a specific comment by ID
 *     description: Update a specific comment by its ID. Only the sender of the comment can update it.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The comment ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Comment not found
 */
router.put("/:id", authenticate, authorizeOwner(CommentsModel, comment => comment.sender_id.toString()), commentsController.update);

// Route to delete a specific comment by ID
/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     tags:
 *       - Comments
 *     summary: Delete a specific comment by ID
 *     description: Delete a specific comment by its ID. Only the sender of the comment can delete it.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The comment ID.
 *     responses:
 *       200:
 *         description: Comment deleted successfully.
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Comment not found
 */
router.delete("/:id", authenticate, authorizeOwner(CommentsModel, comment => comment.sender_id.toString()), commentsController.delete);

export default router;