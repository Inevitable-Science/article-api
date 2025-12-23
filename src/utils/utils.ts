import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import z from "zod";

import { ENV } from "./env";
import { ErrorCodes } from "./errors/errors";

export const JwtBody = z.object({
  userId: z.string(),
});

export type JwtBodyType = z.infer<typeof JwtBody>;

type AuthResult =
  | { success: true; userId: string }
  | { success: false; };

export function VerifyJWT(req: Request): AuthResult {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return { success: false };
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return { success: false };
  }

  const authToken = parts[1];

  try {
    const decoded = jwt.verify(authToken, ENV.JWT_SECRET);
    const parsedDecoded = JwtBody.parse(decoded);
    return { success: true, userId: parsedDecoded.userId };
  } catch {
    return { success: false };
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