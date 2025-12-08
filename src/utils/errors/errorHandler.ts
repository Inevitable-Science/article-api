import type { Response } from "express";

import logAction from "../logAction";

import { ErrorCodes } from "./errors";

export async function handleServerError(res: Response, error: unknown) {
  console.error("Server Error:", error);
  
  let errorMessage: string;
  if (typeof error === "string") {
    errorMessage = error.slice(0, 4096);
  } else if (error instanceof Error) {
    errorMessage = error.message.slice(0, 4096);
  } else {
    errorMessage = "Unknown error";
  }

  const constructedEmbed = {
    title: "Error Logged",
    description: errorMessage || "Unknown Error",
  };

  await logAction({
    action: "logError",
    embed: constructedEmbed
  });

  return res.status(500).json({
    error: ErrorCodes.SERVER_ERROR,
  });
};