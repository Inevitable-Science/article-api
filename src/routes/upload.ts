import { Request, Response } from "express";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import jwt from "jsonwebtoken";

import UserModel from "../database/userSchema";
import { s3Client } from "../index";
import { ENV } from "../utils/env";
import { JwtBody, VerifyJWT } from "../utils/utils";
import { ErrorCodes } from "../utils/errors/errors";
import { handleServerError } from "../utils/errors/errorHandler";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function uploadImageHandler(
  req: Request,
  res: Response
): Promise<void> {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        res.status(400).json({ error: ErrorCodes.UPLOAD_ERROR });
        return;
      }
      res.status(400).json({ error: ErrorCodes.UPLOAD_ERROR });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: ErrorCodes.UPLOAD_NO_FILE });
      return;
    }

    try {
      const { uploadType } = req.params;
      const userId = VerifyJWT(req, res);

      const user = await UserModel.findOne({ userId });
      if (!user) {
        return res.status(403).json({ error: ErrorCodes.USER_NOT_FOUND });
      }

      if (
        uploadType !== "profile" &&
        uploadType !== "article" &&
        uploadType !== "organisation"
      ) {
        return res.status(400).json({ error: ErrorCodes.BAD_REQUEST });
      }

      const file = req.file;
      const ext = path.extname(file.originalname) || ".jpg";
      const key = `/article/${uploadType}/${uuidv4()}${ext}`;

      // Upload to S3
      await s3Client.send(
        new PutObjectCommand({
          Bucket: ENV.S3_BUCKET_NAME!,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          //ACL: "public-read", // Makes it publicly readable
          CacheControl: "public, max-age=31536000, immutable", // 1 year cache
        })
      );

      // Generate final CloudFront URL
      const cloudfrontUrl = `https://${ENV.CLOUDFRONT_DOMAIN}/${key}`;

      user.attachments.push(cloudfrontUrl); // Save UUID, cloudfront domain can alter
      await user.save();

      return res.status(200).json({
        success: true,
        url: cloudfrontUrl,
      });
    } catch (err) {
      await handleServerError(res, err);
    }
  });
}
