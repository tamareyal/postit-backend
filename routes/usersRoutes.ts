import { Router } from "express";
import usersController from "../controllers/usersController";
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Route to get all users - accepts filtering parameters via query string
/**
 * @swagger
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Retrieve a list of users
 *     description: Retrieve a list of users. Can be filtered by query parameters.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */  
router.get("/", authenticate, usersController.getAll);

// Route to get a paginated list of users using cursor-based pagination
/**
 * @swagger
 * /api/users/page:
 *   get:
 *     tags:
 *       - Users
 *     summary: Retrieve the next page of users
 *     description: Returns a batch of users sorted by creation date descending. Pass `lastCreatedAt` from the previous response as a cursor to retrieve the next page.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users to return (max 100).
 *       - in: query
 *         name: lastCreatedAt
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO date cursor from the previous page's `nextCursor` field.
 *     responses:
 *       200:
 *         description: A page of users with a cursor for the next page.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
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
router.get("/page", authenticate, usersController.getNextPage);

// Route to get a specific user by ID
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Retrieve a specific user by ID
 *     description: Retrieve a specific user by their ID.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID.
 *     responses:
 *       200:
 *         description: A single user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get("/:id", authenticate, usersController.getById);

// Route to update a specific user by ID
/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update a specific user by ID
 *     description: Update a specific user's information by their ID.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.put("/:id", authenticate, usersController.update);

// Route to delete a specific user by ID
/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete a specific user by ID
 *     description: Delete a specific user by their ID.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID.
 *     responses:
 *       200:
 *         description: User deleted successfully.
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.delete("/:id", authenticate, usersController.delete);

export default router;