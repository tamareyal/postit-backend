# PostIt Backend

Express + TypeScript + MongoDB backend for users, auth, posts, comments, image upload, and natural-language post search.

## Tech stack

- Node.js + TypeScript
- Express 5
- MongoDB + Mongoose
- JWT authentication
- Multer for image uploads
- Swagger/OpenAPI docs
- Jest + Supertest tests

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment files:

- `.env` for app runtime
- `.env.test` for tests

3. Start MongoDB locally (or provide remote Mongo URIs).

## Environment variables

### Runtime (`.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGO_URI` | Yes | `mongodb://localhost:27017/mydatabase` | MongoDB connection string for the app. |
| `PORT` | No | `4000` | HTTP/HTTPS server port. |
| `NODE_ENV` | No | `development` | Use `production` to enable production-only behavior. |
| `CLIENT_URL` | Production: Yes | `http://localhost:5173` in non-production | Allowed CORS origin for frontend. |
| `JWT_SECRET` | Strongly recommended | `defaultSecretKey` | JWT signing secret for access/refresh tokens. |
| `JWT_EXPIRES_IN` | No | `3000` | Access token expiration (seconds). |
| `REFRESH_TOKEN_EXPIRES_IN` | No | `86400` | Refresh token expiration (seconds). |
| `GOOGLE_CLIENT_ID` | Needed for `POST /api/auth/google` | none | Google OAuth Client ID used to validate Google ID tokens. |
| `SSL_KEY_PATH` | Production HTTPS only | `path/to/ssl/key.pem` | Path to TLS private key when `NODE_ENV=production`. |
| `SSL_CERT_PATH` | Production HTTPS only | `path/to/ssl/cert.pem` | Path to TLS certificate when `NODE_ENV=production`. |
| `OLLAMA_URL` | No | `http://localhost:11434` | Base URL for Ollama API used by post search. |
| `OLLAMA_MODEL` | No | `llama3.1` | Ollama model used for NL-to-Mongo filter generation. |
| `OLLAMA_TIMEOUT_MS` | No | `120000` | Timeout in ms for Ollama requests. |
| `OLLAMA_API_KEY` | No | none | Optional bearer token for Ollama endpoint. |

### Test runtime (`.env.test`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGO_MOCK_URI` | Yes (recommended) | `mongodb://localhost:27017/mockdatabase` | MongoDB URI used by Jest setup. |
| `PORT` | No | `3000` | Test server port. |

### Example `.env`

```env
MONGO_URI=mongodb://localhost:27017/postit
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace-with-strong-secret
JWT_EXPIRES_IN=3000
REFRESH_TOKEN_EXPIRES_IN=86400
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Optional (AI search)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
OLLAMA_TIMEOUT_MS=120000
# OLLAMA_API_KEY=
```

### Example `.env.test`

```env
MONGO_MOCK_URI=mongodb://localhost:27017/postit_test
PORT=3000
JWT_SECRET=test-secret
```

## Scripts

- `npm run dev` — run with nodemon (`server.ts`)
- `npm run start` — compile TypeScript and run `dist/server.js`
- `npm test` — compile + run all tests
- `npm run testAuth`
- `npm run testUsers`
- `npm run testPosts`
- `npm run testComments`
- `npm run testImageUpload`
- `npm run lint`

## API docs

- Swagger UI: `http://localhost:4000/api/docs` (or your configured `PORT`)
- Static uploads: `http://localhost:4000/uploads/<filename>`

## Main API routes

### Auth (`/api/auth`)

- `POST /register`
- `POST /login`
- `POST /refresh-token`
- `POST /logout`
- `GET /me` (auth required)
- `POST /google` (Google credential login)

### Users (`/api/users`)

- `GET /` (auth required)
- `GET /page` (cursor pagination)
- `GET /:id` (auth required)
- `PUT /:id` (auth required)
- `DELETE /:id` (auth required)

### Posts (`/api/posts`)

- `GET /` (auth required)
- `GET /page` (cursor pagination)
- `GET /users/:userId` (cursor pagination and full-list mode)
- `GET /:id` (auth required)
- `POST /` (auth required)
- `POST /search` (auth required, uses Ollama service)
- `PUT /:id` (auth + owner required)
- `PUT /:id/like` (auth required)
- `DELETE /:id` (auth + owner required)

### Comments (`/api/comments`)

- `GET /` (auth required)
- `GET /page` (cursor pagination)
- `GET /posts/:postId` (supports full-list or paged query-hash flow)
- `GET /:id` (auth required)
- `POST /` (auth required)
- `PUT /:id` (auth + owner required)
- `DELETE /:id` (auth + owner required)

### General / Storage (`/api/general`)

- `POST /upload` (multipart field: `image`)
- `DELETE /upload/:filename`

## REST client examples

- [rests/auth.rest](rests/auth.rest)
- [rests/users.rest](rests/users.rest)
- [rests/posts.rest](rests/posts.rest)
- [rests/comments.rest](rests/comments.rest)

## Production notes

- In production mode (`NODE_ENV=production`), the server starts with HTTPS using `SSL_KEY_PATH` and `SSL_CERT_PATH`.
- `CLIENT_URL` must be set in production.
- PM2 config exists in `ecosystem.config.js` and runs `dist/server.js` as app `postit`.