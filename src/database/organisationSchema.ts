import mongoose, { Schema, Document, Model } from "mongoose";
import z from "zod";

export const UserPermissionsZ = z.object({
  userId: z.string(),
  isAdmin: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  canCreate: z.boolean(),
});

export const OrganisationSchemaZ = z.object({
  organisationName: z.string(),
  organisationId: z.string().transform((val) => val.toLowerCase()),
  users: z.array(UserPermissionsZ),
  metadata: z.object({
    logo: z.string(),
    description: z.string(),
    website: z.string(),
    x: z.string(),
    discord: z.string(),
  }),
});

export interface UserPermissions {
  userId: string;
  isAdmin: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
}

export interface Organisation {
  organisationName: string;
  organisationId: string;
  users: UserPermissions[];
  metadata: {
    logo: string;
    description: string;
    website: string;
    x: string;
    discord: string;
  };
}

export interface OrganisationDocument extends Organisation, Document {}

const UserPermsSchema = new Schema<UserPermissions>(
  {
    userId: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    canCreate: { type: Boolean, default: false },
  },
  { _id: false }
);

export const OrganisationSchema: Schema<OrganisationDocument> = new Schema({
  organisationName: { type: String, required: true, unique: true, index: true },
  organisationId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
  },
  users: { type: [UserPermsSchema], default: [] },
  metadata: {
    logo: { type: String, required: false },
    description: { type: String, required: false },
    website: { type: String, required: false },
    x: { type: String, required: false },
    discord: { type: String, required: false },
  },
});

OrganisationSchema.index({ "users.userId": 1 });

const OrganisationModel: Model<OrganisationDocument> =
  mongoose.model<OrganisationDocument>(
    "organisation_collections",
    OrganisationSchema
  );

export default OrganisationModel;
