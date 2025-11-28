import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();

import rateLimit from "express-rate-limit";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Dependencies
import cors from "cors";
import { S3Client } from "@aws-sdk/client-s3";

// Database
import mongoose from "mongoose";

import { ENV } from "./utils/env";
import { ErrorCodes } from "./utils/errors/errors";
import { uploadImageHandler } from "./routes/upload";
import userRouter from "./routes/user/userRouter";
import articleRouter from "./routes/article/articleRouter";
import organisationRouter from "./routes/organisation/organisationRouter";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: "*", // allow any origin
    methods: ["GET", "POST"], // allow GET and POST requests
    credentials: false, // do not allow credentials (cookies, auth headers, etc.)
  })
);

// ----- IP RATE LIMIT: 10 req/sec -----
const ipLimiter = rateLimit({
  windowMs: 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// ----- GLOBAL RATE LIMIT: 15,000 req/min -----
const globalLimiter = new RateLimiterMemory({
  points: 15000,
  duration: 60,
});

const globalRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await globalLimiter.consume("global");
    next();
  } catch {
    res.status(429).json({
      error: ErrorCodes.RATE_LIMIT,
    });
  }
};

// ----- Apply both middlewares -----
app.use(ipLimiter);
app.use(globalRateLimit);

export const s3Client = new S3Client({
  region: ENV.AWS_REGION,
  credentials: {
    accessKeyId: ENV.AWS_ACCESS_KEY_ID,
    secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
  },
});

const connectDB = async () => {
  try {
    const mongo_uri = ENV.MONGO_URI;
    if (!mongo_uri) {
      console.warn("No Mongo URI found");
      return;
    }

    const conn = await mongoose.connect(mongo_uri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

app.get("/", (_req, res) => {
  res.send("200");
});

app.post("/upload/:uploadType", uploadImageHandler);
app.use("/user", userRouter);
app.use("/article", articleRouter);
app.use("/organisation", organisationRouter);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log("listening for requests");
  });
});
