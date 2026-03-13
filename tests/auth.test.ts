import request from "supertest";
import { serverURL } from "./mockdata";
import { testUser, expressApp } from "../jest.setup";
import TestUser from "./misc/auth";
import { AuthenticatedRequest, authenticate, authorizeOwner } from "../middlewares/authMiddleware";
import { Response } from "express";
import authController from "../controllers/authController";
import UserModel from "../models/users";
import { Request } from "express";
import { register } from "ts-node";
import { isEmptyBindingElement } from "typescript";
import { OAuth2Client } from "google-auth-library";

describe('Authentication Tests', () => {

    test('Register a new user', async () => {
        const newtestuser = {
            username: 'newtestuser',
            email: 'newtestuser@example.com',
            password: 'NewTestPassword123'
        };

        const res = await request(serverURL)
            .post('/api/auth/register')
            .send(newtestuser);
        
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('userId');
    });


    test('Register a new user with only username and password', async () => {
        const newtestuser = {
            username: 'newtestuser',
            password: 'NewTestPassword123'
        };

        const res = await request(expressApp)
            .post('/api/auth/register')
            .send(newtestuser);
        
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('All fields are required');
    });

    test('Register a new user with only username and email', async () => {
        const newtestuser = {
            username: 'newtestuser',
            email: 'newtestuser@example.com'
        };

        const res = await request(serverURL)
            .post('/api/auth/register')
            .send(newtestuser);
        
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('All fields are required');
    });


    test('Register a new user with only password and email', async () => {
        const newtestuser = {
            password: 'NewTestPassword123',
            email: 'newtestuser@example.com'
        };

        const res = await request(serverURL)
            .post('/api/auth/register')
            .send(newtestuser);
        
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('All fields are required');
    });

    test('Register a new user with only password', async () => {
        const newtestuser = {
            password: 'NewTestPassword123',
        };

        const res = await request(serverURL)
            .post('/api/auth/register')
            .send(newtestuser);
        
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('All fields are required');
    });

    test('Register a new user with only email', async () => {
        const newtestuser = {
            email: 'newtestuser@example.com'
        };

        const res = await request(serverURL)
            .post('/api/auth/register')
            .send(newtestuser);
        
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('All fields are required');
    });

        test('Register a new user with only username', async () => {
        const newtestuser = {
            username: 'newtestuser'
        };

        const res = await request(serverURL)
            .post('/api/auth/register')
            .send(newtestuser);
        
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('All fields are required');
    });


    test('register returns 500 when create throws', async () => {
        const req = {
            body: {
            username: 'user',
            email: 'user@example.com',
            password: 'password',
            },
        } as any;

        const jsonMock = jest.fn();
        const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        const res = { status: statusMock } as any;

        const createSpy = jest.spyOn(UserModel as any, 'create').mockRejectedValueOnce(new Error('Database failure'));

        await authController.register(req, res);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Server error' }));

        createSpy.mockRestore();
        });


    test('Login with existing user', async () => {
        const credentials = {
            identifier: testUser.email,
            password: testUser.password
        };

        const res = await request(serverURL)
            .post('/api/auth/login')
            .send(credentials);
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('refreshToken');
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('userId');

        testUser.accessToken = res.body.token;
        testUser.refreshToken = res.body.refreshToken;
    });


    test('Login no email or password', async () => {
        const credentials = {};

        const res = await request(serverURL)
            .post('/api/auth/login')
            .send(credentials);
        
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Identifier and password are required');
    });


    test('Refresh tokens', async () => {
        const res = await request(serverURL)
            .post('/api/auth/refresh-token')
            .send({ refreshToken: testUser.refreshToken });
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('refreshToken');

        testUser.accessToken = res.body.token;
        testUser.refreshToken = res.body.refreshToken;
    });


    test('Refresh tokens without refresh token', async () => {
         const res = await request(expressApp)
        .post('/api/auth/refresh-token')
        .send({}); // no refreshToken provided

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Refresh token is required');

        const newtestuser = {
            username: 'newtestuser2',
            email: 'newtestuser2@example.com',
            password: 'NewTestPassword123'
        };

        const res2 = await request(serverURL)
            .post('/api/auth/register')
            .send(newtestuser);
        
        expect(res2.status).toBe(201);
        expect(res2.body).toHaveProperty('userId');

    });

    test('Get current authenticated user', async () => {
        const res = await request(serverURL)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${testUser.accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('_id', testUser.id);
        expect(res.body).toHaveProperty('email', testUser.email);
        expect(res.body).not.toHaveProperty('password');
    });



    test('Login with invalid credentials', async () => {
        const credentials = {
            identifier: 'invaliduser@example.com',
            password: 'WrongPassword123'
        };

        const res = await request(serverURL)
            .post('/api/auth/login')
            .send(credentials);
        
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Invalid credentials');
    });

    test('Refresh tokens with invalid token', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        
        const res = await request(serverURL)
            .post('/api/auth/refresh-token')
            .send({ refreshToken: 'InvalidRefreshToken' });
        
        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Server error');
        
        consoleErrorSpy.mockRestore();
    });

    test('Refresh tokens with expired token', async () => {

        const res = await request(serverURL)
            .post('/api/auth/refresh-token')
            .send({ refreshToken: testUser.refreshToken });

        const oldRefreshToken = testUser.refreshToken;
        testUser.accessToken = res.body.token;
        testUser.refreshToken = res.body.refreshToken;

        const res2 = await request(expressApp)
            .post('/api/auth/refresh-token')
            .send({ refreshToken: oldRefreshToken });
        
        expect(res2.status).toBe(403);
        expect(res2.body.message).toBe('Refresh token reuse detected');
        const user = await UserModel.findById(testUser.id);
        expect(user?.refreshTokens).toEqual([]);


        // Re-login to get valid tokens again
        const credentials = {
            identifier: testUser.email,
            password: testUser.password
        };

        const res3 = await request(serverURL)
            .post('/api/auth/login')
            .send(credentials);

        testUser.accessToken = res3.body.token;
        testUser.refreshToken = res3.body.refreshToken;
    });


    test('Register with existing email', async () => {
        const newUser = new TestUser(
            'testuser2',
            testUser.email,
            'AnotherPassword123'
        );

        const res = await request(expressApp)
            .post('/api/auth/register')
            .send(newUser);
        
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('User with this email already exists');
    });

    test("returns 401 and 'Token missing' when Bearer header has no token", () => {
        const req = { headers: { authorization: "Bearer " } } as unknown as AuthenticatedRequest;

        const jsonMock = jest.fn();
        const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        const res = { status: statusMock } as unknown as Response;

        const next = jest.fn();

        authenticate(req, res, next);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ message: "Token missing" });
        expect(next).not.toHaveBeenCalled();
  });

    test("returns 400 and 'Unauthenticated' when req.userId is missing", async () => {
        const model = {
        findById: jest.fn(),
        };

        const middleware = authorizeOwner(model as any, (r: any) => r.owner);

        const req = {
        params: { id: "123" },
        userId: undefined,
        } as any;

        const jsonMock = jest.fn();
        const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        const res = { status: statusMock } as any;

        const next = jest.fn();

        await middleware(req, res, next);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ message: "Unauthenticated" });
        expect(next).not.toHaveBeenCalled();
        expect(model.findById).not.toHaveBeenCalled();
    });

    test("Login with invalid credentials username", async () => {
        const credentials = {
            identifier: testUser.username,
            password: 'WrongPassword123'
        };

        const res = await request(expressApp)
            .post('/api/auth/login')
            .send(credentials);
        
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Invalid credentials');
    });

    test("Login with DB error", async () => {
        const req = {
            body: {
                identifier: testUser.username,
                password: testUser.password,
            },
        } as any;

        jest.spyOn(UserModel, 'findOne').mockImplementationOnce(() => {
            throw new Error('Database failure');
        });
        const res = await request(expressApp)
            .post('/api/auth/login')
            .send({ identifier: testUser.username, password: testUser.password });
        
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('message', 'Server error');
    });


    test("Refresh tokens with DB error", async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        
        jest.spyOn(UserModel, 'findById').mockImplementationOnce(() => {
            throw new Error('Database failure');
        });

        const res = await request(expressApp)
            .post('/api/auth/refresh-token')
            .send({ refreshToken: testUser.refreshToken });
        
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('message', 'Server error');
        
        consoleErrorSpy.mockRestore();
    });

    test('Google login without credential', async () => {
        const res = await request(expressApp)
            .post('/api/auth/google')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Google credential required');
    });


    test('Google login with valid credential', async () => {
        const verifyIdTokenSpy = jest.spyOn(OAuth2Client.prototype as any, 'verifyIdToken').mockResolvedValue({
            getPayload: () => ({
                email: `google-user-${Date.now()}@example.com`,
                name: 'Google Test User',
                sub: `google-sub-${Date.now()}`
            })
        } as any);

        const res = await request(expressApp)
            .post('/api/auth/google')
            .send({ credential: 'mock-google-credential' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('refreshToken');
        expect(res.body).toHaveProperty('userId');

        verifyIdTokenSpy.mockRestore();
    });

    test('Google login with invalid credential', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const verifyIdTokenSpy = jest.spyOn(OAuth2Client.prototype as any, 'verifyIdToken').mockRejectedValue(new Error('Invalid token'));

        const res = await request(expressApp)
            .post('/api/auth/google')
            .send({ credential: 'invalid-google-credential' });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('message', 'Google authentication failed');

        verifyIdTokenSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    test('Logout with valid refresh token', async () => {
        const unique = Date.now();

        const tempUser = new TestUser(
            `logout-user-${unique}`,
            `logout-user-${unique}@example.com`,
            "LogoutPassword123"
        );
        const [, refreshToken] = await tempUser.registerUser(serverURL);

        const res = await request(expressApp)
            .post('/api/auth/logout')
            .send({ refreshToken });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Logged out successfully');
    });

    test('Logout without refresh token', async () => {
        const res = await request(expressApp)
            .post('/api/auth/logout')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Refresh token is required');
    });


    test('Google login for existing password user links account', async () => {
        const existingUser = await UserModel.create({
            name: 'Existing User',
            email: 'existing@example.com',
            password: 'hashedpassword',
            refreshTokens: []
        });

        const verifyIdTokenSpy = jest.spyOn(OAuth2Client.prototype as any, 'verifyIdToken').mockResolvedValue({
            getPayload: () => ({
                email: 'existing@example.com',
                name: 'Existing User',
                sub: 'google-sub-existing'
            })
        } as any);

        const res = await request(expressApp)
            .post('/api/auth/google')
            .send({ credential: 'mock-google-credential' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('refreshToken');
        expect(res.body).toHaveProperty('userId', existingUser._id.toString());

        const updatedUser = await UserModel.findById(existingUser._id);
        expect(updatedUser?.googleId).toBe('google-sub-existing');

        verifyIdTokenSpy.mockRestore();
    });


    test('Logout only removes specific refresh token', async () => {
        const unique = Date.now();
        const email = `multi-${unique}@example.com`;
        const password = 'MultiSessionPassword123';

        const tempUser = new TestUser(
            `multi-user-${unique}`,
            email,
            password
        );
        const [, refreshToken] = await tempUser.registerUser(serverURL);

        const firstRefreshToken = refreshToken;

       const res2 = await request(serverURL)
            .post('/api/auth/login')
          .send({ identifier: email, password });
        
        expect(res2.status).toBe(200);
        const userId = res2.body.userId;
        const secondRefreshToken = res2.body.refreshToken;

        // Logout using first token
        const res4 = await request(expressApp)
            .post('/api/auth/logout')
            .send({ refreshToken: firstRefreshToken });
        
        expect(res4.status).toBe(200);
        expect(res4.body.message).toBe('Logged out successfully');

        const updatedUser = await UserModel.findById(userId);
        expect(updatedUser?.refreshTokens).toContain(secondRefreshToken);
        expect(updatedUser?.refreshTokens).not.toContain(firstRefreshToken);
        expect(updatedUser?.refreshTokens.length).toBe(1);
    });


    test('Get current user protected route with invalid token', async () => {
        const res = await request(expressApp)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer invalidtoken');

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Invalid token');
    });

        
    test('Google login fails if email taken by another Google account', async () => {
        await UserModel.create({
            name: 'ExistingUser',
            email: 'taken@example.com',
            googleId: 'some-other-google-id',
            refreshTokens: []
        });

        const verifyIdTokenSpy = jest.spyOn(OAuth2Client.prototype as any, 'verifyIdToken').mockResolvedValue({
            getPayload: () => ({
                email: 'taken@example.com',
                name: 'Hacker',
                sub: 'google-sub-new'
            })
        } as any);

        const res = await request(expressApp)
            .post('/api/auth/google')
            .send({ credential: 'mock-google-credential' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch("Email already linked to another Google account");

        verifyIdTokenSpy.mockRestore();
    });

});