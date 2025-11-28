import mongoose, { Schema, Document, Model } from "mongoose";
import z from "zod";

export const UserMetadataZ = z.object({
  username: z.string(),
  profilePicture: z.string(),
  socials: z.object({
    x: z.string(),
    linkedIn: z.string(),
    website: z.string(),
  }),
});

export const UserSchemaZ = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .transform((val) => val.toLowerCase()),
  userId: z.string().transform((val) => val.toLowerCase()),
  currentNonce: z.number(),
  isTopLevelAdmin: z.boolean(),
  attachments: z.array(z.string()),
  userMetadata: UserMetadataZ,
});

export interface UserMetadata {
  username: string;
  profilePicture: string;
  socials: {
    x: string;
    linkedIn: string;
    website: string;
  };
}

export interface UserSchema {
  walletAddress: string;
  userId: string;
  currentNonce: number;
  isTopLevelAdmin: boolean;
  attachments: string[];
  userMetadata: UserMetadata;
}

export interface UserDocument extends UserSchema, Document {}

// Sub-schema for UserMetadata
const UserMetadataSchema = new Schema<UserMetadata>(
  {
    username: { type: String, required: true },
    profilePicture: { type: String, required: false },
    socials: {
      x: { type: String, required: false },
      linkedIn: { type: String, required: false },
      website: { type: String, required: false },
    },
  },
  { _id: false }
);

// Main UserSchema
export const UserSchema: Schema<UserDocument> = new Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
    match: /^0x[a-fA-F0-9]{40}$/,
  },
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
  },
  currentNonce: { type: Number, required: true },
  isTopLevelAdmin: { type: Boolean, default: false },
  attachments: { type: [String], default: [] },
  userMetadata: { type: UserMetadataSchema, required: true },
});

const UserModel: Model<UserDocument> = mongoose.model<UserDocument>(
  "user_collections",
  UserSchema
);

export default UserModel;
