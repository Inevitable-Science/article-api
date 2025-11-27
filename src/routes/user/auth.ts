import { Request, Response } from "express";
import { Address, verifyMessage } from "viem";
import { ENV } from "../../utils/env";
import UserModel from '../../database/userSchema';
import { JwtBodyType } from "../../utils/types";
import { getMessage } from "../../utils/utils";
import z from "zod";
import jwt from "jsonwebtoken";


export async function getNonceHandler(req: Request, res: Response): Promise<void> {
  try {
    const { address } = req.params;

    const parsedAddress = z.string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .safeParse(address);

    if (!parsedAddress.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    };

    const walletAddress = parsedAddress.data.toLowerCase();
    const user = await UserModel.findOne({ walletAddress });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    };

    res.status(200).json({ nonce: user.currentNonce });
    return;
  } catch (err: unknown) {
    res.status(500).json({ error: `Error fetching user data: ${err}` });
    return;
  }
};


const AuthHandlerBody = z.object({
  address: z.string(),
  signature: z.string(),
});

export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const parsed = AuthHandlerBody.parse(req.body);
    const { address, signature } = parsed;

    // Find user by wallet address
    const user = await UserModel.findOne({ walletAddress: address.toLowerCase() });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const message = getMessage("login", user.walletAddress, user.currentNonce);

    const valid = await verifyMessage({ 
      address: user.walletAddress as Address,
      message: message,
      signature: signature as `0x${string}`,
    });

    // Increase nonce reguardless of validity
    user.currentNonce += 1;
    const savedNonce = await user.save();

    if (!savedNonce) throw new Error();

    if (!valid) {
      res.status(403).json({ error: "Could not verify signature" });
      return;
    };

    const payload: JwtBodyType = { userId: user.userId.toLowerCase() };
    const userToken = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ key: userToken });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: `Error fetching user data` });
    return;
  }
};
