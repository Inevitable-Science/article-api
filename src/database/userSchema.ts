import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";
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
  userId: z.string().transform((val) => val.toLowerCase()),
  password: z.string(),
  mfaKey: z.string(),
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
  userId: string;
  password: string;
  mfaKey: string;
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
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
  },
  password: { type: String, required: true },
  mfaKey: { type: String, required: true },
  isTopLevelAdmin: { type: Boolean, default: false },
  attachments: { type: [String], default: [] },
  userMetadata: { type: UserMetadataSchema, required: true },
});

const UserModel: Model<UserDocument> = mongoose.model<UserDocument>(
  "user_collections",
  UserSchema
);

export default UserModel;
