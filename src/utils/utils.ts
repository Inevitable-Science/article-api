import { ENV } from "./env";

import jwt from "jsonwebtoken";
import z from "zod";

export const JwtBody = z.object({
  userId: z.string(),
});

export type JwtBodyType = z.infer<typeof JwtBody>;

export function VerifyJWT(authHeader: string | undefined): string {
  if (!authHeader) {
    throw new Error();
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    throw new Error();
  }

  const authToken = parts[1];

  const decoded = jwt.verify(authToken, ENV.JWT_SECRET); // throws error if incorrect
  const parsedDecoded = JwtBody.parse(decoded);
  const userId = parsedDecoded.userId.toLowerCase();

  return userId;
}

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

const actions = ["login"] as const;
type Action = (typeof actions)[number];

export function getMessage(
  action: Action,
  walletAddress: string,
  nonce: number
) {
  if (!action || !walletAddress || typeof nonce !== "number") throw new Error();

  const message = `Authorize this action by signing below.\nNo cost. No sensitive data shared.\nAction: ${action}\nAddress: ${walletAddress.toLowerCase()}\nNonce: ${nonce}`;
  return message;
}
