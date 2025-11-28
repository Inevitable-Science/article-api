import { Response } from "express";
import { ErrorCodes } from "./errors";

export async function handleServerError(res: Response, error: unknown) {
  console.error("Server Error:", error);

  return res.status(500).json({
    error: ErrorCodes.SERVER_ERROR,
  });
};