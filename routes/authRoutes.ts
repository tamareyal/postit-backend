import { Router } from "express";
import authController from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

// Route to register as a new user
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     description: Register a new user with a username and password.
 *     requestBody:
 *       required: true
 *       content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/AuthRegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthRegisterResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/register", authController.register);

// Route to login as an existing user
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login as an existing user
 *     description: Login with an identifier (username or email) and password to receive access and refresh tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLoginRequest'
 *     responses:
 *       200:
 *         description: Login successful, returns access and refresh tokens.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthLoginResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */ 
router.post("/login", authController.login);

// Route to refresh tokens
/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Refresh access and refresh tokens
 *     description: Use a valid refresh token to obtain new access and refresh tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRefreshRequest'
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthLoginResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/refresh-token", authController.refreshToken);

// Route to logout and invalidate refresh token
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Logout the current session
 *     description: Invalidate a valid refresh token and remove it from the user's active tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRefreshRequest'
 *     responses:
 *       200:
 *         description: Logged out successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/logout", authController.logout);

// Route to get current authenticated user
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get the currently authenticated user
 *     description: Returns the current authenticated user profile based on the bearer access token.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/me", authenticate, authController.getMe);

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Authenticate with Google
 *     description: Validates a Google ID credential, creates or links a user, and returns access and refresh tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *             properties:
 *               credential:
 *                 type: string
 *                 description: Google ID token credential returned by the client.
 *     responses:
 *       200:
 *         description: Google authentication successful.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthLoginResponse'
 *       400:
 *         description: Missing Google credential
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Google authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/google', authController.googleLogin);

export default router;