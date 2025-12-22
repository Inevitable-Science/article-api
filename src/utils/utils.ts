import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import z from "zod";

import { ENV } from "./env";
import { ErrorCodes } from "./errors/errors";

export const JwtBody = z.object({
  userId: z.string(),
});

export type JwtBodyType = z.infer<typeof JwtBody>;


export function VerifyJWT(req: Request, res: Response): string | undefined {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(403).json({ error: ErrorCodes.UNAUTHORIZED });
    return;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.status(403).json({ error: ErrorCodes.UNAUTHORIZED });
    return;
  }

  const authToken = parts[1];

  try {
    const decoded = jwt.verify(authToken, ENV.JWT_SECRET);
    const parsedDecoded = JwtBody.parse(decoded);
    return parsedDecoded.userId.toLowerCase();
  } catch {
    res.status(403).json({ error: ErrorCodes.UNAUTHORIZED });
    return;
  };
};

const idTypes = ["userId", "articleId", "organisationId"] as const;
type IdType = (typeof idTypes)[number];

const idLengths: Record<IdType, number> = {
  userId: 6,
  organisationId: 8,
  articleId: 10,
};

export function generateRandomId(idType: IdType): string {
  const length = idLengths[idType];
  const chars = "abcdef0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `0x${result}`.toLowerCase();
}

export function generateDiscordTimestamp(
  date: Date | number,
  style: "t" | "T" | "d" | "D" | "f" | "F" | "R" = "f"
): string {
  const timestamp = Math.floor(
    date instanceof Date ? date.getTime() / 1000 : date / 1000
  );
  return `<t:${timestamp}:${style}>`;
}

export function generatePassword(length = 10) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#%*+-=';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}