import express, { Express } from "express";
import postsRouter from "./routes/postsRoutes";
import commentsRouter from "./routes/commentsRoutes";
import usersRouter from "./routes/usersRoutes";
import authRouter from "./routes/authRoutes";
import generalRouter from "./routes/generalRoutes";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";
import cors from 'cors';


async function startServer(port: number, mongoURL: string): Promise<[mongoose.Connection, Express]> {
  try {
    const connection = await connectToDatabase(mongoURL);

    const app = setupExpress();

    return [connection, app];
  } catch (error) {
    console.error(`Failed to start server: ${error}`);
    throw error;
  }
}

function setupExpress(): Express {
  const app = express();    
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  const NODE_ENV = process.env.NODE_ENV || "development";
  const CLIENT_URL = process.env.CLIENT_URL;

  if (NODE_ENV === "production" && !CLIENT_URL) {
    console.error("CLIENT_URL environment variable must be set in production");
    process.exit(1);
  }

  const corsOrigin =
  NODE_ENV === "production"
    ? CLIENT_URL
    : process.env.CLIENT_URL || "http://localhost:5173";

  app.use(cors({
    origin: corsOrigin,
    credentials: true, 
  }));

  app.use("/uploads", express.static("uploads"));
  app.use("/api/general", generalRouter);

  app.use("/api/posts", postsRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


  return app;
}

async function connectToDatabase(mongoURL: string): Promise<mongoose.Connection> {
  if (!mongoURL) {
    throw new Error("MONGODB_URI is not defined");
  }

  try {
    await mongoose.connect(mongoURL, {});
    console.log("Connected to MongoDB");
    
    const conn = mongoose.connection;
    conn.on("error", (error) => {
        console.error(error);
    });

    return conn;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export default startServer
