import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { authenticator, totp } from "otplib";
import { Address, verifyMessage } from "viem";
import z from "zod";

import UserModel from "../../database/userSchema";
import { ENV } from "../../utils/env";
import { handleServerError } from "../../utils/errors/errorHandler";
import { ErrorCodes } from "../../utils/errors/errors";
import type { Embed } from "../../utils/logAction";
import logAction from "../../utils/logAction";
import { generateDiscordTimestamp } from "../../utils/utils";
import type { JwtBodyType } from "../../utils/utils";

/*
export async function getNonceHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { address } = req.params;

    const parsedAddress = z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .safeParse(address);

    if (!parsedAddress.success) {
      res.status(400).json({ error: ErrorCodes.BAD_REQUEST });
      return;
    }

    const walletAddress = parsedAddress.data.toLowerCase();
    const user = await UserModel.findOne({ walletAddress });

    if (!user) {
      res.status(404).json({ error: ErrorCodes.USER_NOT_FOUND });
      return;
    }

    res.status(200).json({ nonce: user.currentNonce });
    return;
  } catch (err) {
    await handleServerError(res, err);
  };
};

const AuthHandlerBody = z.object({
  address: z.string(),
  signature: z.string(),
});

export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const parsed = AuthHandlerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: ErrorCodes.BAD_REQUEST });
      return;
    };

    const { address, signature } = parsed.data;

    // Find user by wallet address
    const user = await UserModel.findOne({
      walletAddress: address.toLowerCase(),
    });
    if (!user) {
      res.status(404).json({ error: ErrorCodes.USER_NOT_FOUND });
      return;
    }

    const message = `Authorize this action by signing below.\nNo cost. No sensitive data shared.\nAction: login\nAddress: ${address.toLowerCase()}\nNonce: ${user.currentNonce}`;

    const valid = await verifyMessage({
      address: user.walletAddress as Address,
      message: message,
      signature: signature as `0x${string}`,
    });

    // Increase nonce reguardless of validity
    user.currentNonce += 1;
    const savedNonce = await user.save();

    if (!savedNonce) throw new Error(ErrorCodes.DATABASE_ERROR);

    if (!valid) {
      res.status(403).json({ error: ErrorCodes.UNAUTHORIZED });
      return;
    }

    const payload: JwtBodyType = { userId: user.userId.toLowerCase() };
    const userToken = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: "7d" });

    const constructedEmbed: Embed = {
      title: "User Logged In",
      description: `${user.userMetadata.username} Logged In ${generateDiscordTimestamp(new Date(), "R")}`,
      author: {
        name: `${user.userMetadata.username} - ${user.userId}`,
        icon_url: user.userMetadata.profilePicture
      }
    };

    await logAction({
      action: "logAction",
      embed: constructedEmbed
    });

    res.status(200).json({ key: userToken });
    return;
  } catch (err) {
    await handleServerError(res, err);
  };
};*/







const LoginHandlerBody = z.object({
  userId: z.string(),
  password: z.string(),
  mfaCode: z.string().length(6, "MFA code must be 6 digits").regex(/^\d+$/, "MFA code must contain only digits"),
});

export async function loginPasswordHandler(req: Request, res: Response): Promise<void> {
  try {
    const parsed = LoginHandlerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: ErrorCodes.BAD_REQUEST });
      return;
    };

    const { userId, password, mfaCode } = parsed.data;

    const user = await UserModel.findOne({ userId });
    if (!user) {
      res.status(404).json({ error: ErrorCodes.USER_NOT_FOUND });
      return;
    };

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log(isValid);
      res.status(403).json({ error: ErrorCodes.UNAUTHORIZED });
      return;
    };

    const validMfaCode = authenticator.verify({
      token: String(mfaCode),
      secret: user.mfaKey.trim(),
    });
    if (!validMfaCode) {
      console.log(mfaCode);
      res.status(403).json({ error: ErrorCodes.UNAUTHORIZED });
      return;
    }

    const payload: JwtBodyType = { userId: user.userId.toLowerCase() };
    const userToken = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: "7d" });

    const constructedEmbed: Embed = {
      title: "User Logged In",
      description: `${user.userMetadata.username} Logged In ${generateDiscordTimestamp(new Date(), "R")}`,
      author: {
        name: `${user.userMetadata.username} - ${user.userId}`,
        icon_url: user.userMetadata.profilePicture
      }
    };

    await logAction({
      action: "logAction",
      embed: constructedEmbed
    });

    res.status(200).json({ key: userToken });
    return;
  } catch (err) {
    await handleServerError(res, err);
  };
};
