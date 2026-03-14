import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { 
      title: "API documentation for Advanced Web Dev 2 project",
      version: "1.0.0",
      description: "API docs for users, posts, comments, and authentication."
    },
    servers: [
      { url: "http://localhost:3000", description: "Local server" }
    ],
    tags: [
      { name: "Users", description: "User endpoints" },
      { name: "Posts", description: "Post endpoints" },
      { name: "Comments", description: "Comment endpoints" },
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Storage", description: "Image upload and deletion endpoints" }
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string", description: "User ID" },
            username: { type: "string", description: "User's username" },
            email: { type: "string", description: "User's email address" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        Post: {
          type: "object",
          properties: {
            _id: { type: "string", description: "Post ID" },
            title: { type: "string", description: "Post title" },
            content: { type: "string", description: "Post content" },
            sender_id: { type: "string", description: "ID of the user who created the post" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        Comment: {
          type: "object",
          properties: {
            _id: { type: "string", description: "Comment ID" },
            post_id: { type: "string", description: "ID of the post the comment belongs to" },
            message: { type: "string", description: "Comment message" },
            sender_id: { type: "string", description: "ID of the user who created the comment" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        AuthRegisterRequest: {
            type: "object",
            properties: {
              username: { type: "string", description: "Desired username" },
              email: { type: "string", description: "Desired email address" },
              password: { type: "string", description: "Desired password" }
            },
            required: ["username", "email", "password"]
        },
        AuthRegisterResponse: {
          type: "object",
          properties: {
            userId: { type: "string", description: "ID of the newly registered user" },
            token: { type: "string", description: "JWT token for the registered user" },
            refreshToken: { type: "string", description: "Refresh token for obtaining new JWT tokens" }
          }
        },
        AuthLoginRequest: {
          type: "object",
          properties: {
            identifier: { type: "string", description: "Username or email" },
            password: { type: "string", description: "User's password" }
          },
          required: ["identifier", "password"]
        },
        AuthLoginResponse: {
          type: "object",
          properties: {
            userId: { type: "string", description: "ID of the authenticated user" },
            token: { type: "string", description: "JWT token for the authenticated user" },
            refreshToken: { type: "string", description: "Refresh token for obtaining new JWT tokens" }
          }

        },
        AuthRefreshRequest: {
            type: "object",
            properties: {
              refreshToken: { type: "string", description: "Refresh token for obtaining new JWT tokens" }
            },
            required: ["refreshToken"]
        },
        ErrorResponse: {
          type: "object",
          properties: {
            message: { type: "string", description: "Error message" }
          }
        },
        ImageUploadResponse: {
          type: "object",
          properties: {
            path: { type: "string", description: "Relative path of the uploaded image" }
          }
        },
        DeleteImageResponse: {
          type: "object",
          properties: {
            message: { type: "string", description: "Deletion result message" }
          }
        }
      }
    }
  },
  apis: ["./routes/*.ts", "./controllers/*.ts", "./models/*.ts"]
});
