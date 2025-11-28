import mongoose, { Schema, Document, Model } from "mongoose";
import z from "zod";

export const ArticleSchemaZ = z.object({
  title: z.string(),
  articleId: z.string().transform((val) => val.toLowerCase()),
  organisationId: z.string(),
  displayRules: z.object({
    hidden: z.boolean().default(false),
    deleted: z.boolean().default(false),
    showOnMainSite: z.boolean().default(true),
  }),
  metadata: z.object({
    dateWritten: z.date(),
    author: z.string(),
    editors: z.array(z.string()),
  }),
  content: z.object({
    keywords: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    attachments: z.array(z.string()).default([]),
    landingImage: z.string().optional(),
    content: z.string(),
  }),
});

export interface ArticleDisplayRules {
  hidden: boolean;
  deleted: boolean;
  showOnMainSite: boolean;
}

export interface ArticleMetadata {
  dateWritten: Date;
  author: string;
  editors: string[];
}

export interface ArticleContent {
  keywords: string[];
  tags: string[];
  attachments: string[];
  landingImage?: string;
  content: string;
}

export interface Article {
  title: string;
  articleId: string;
  organisationId: string;
  displayRules: ArticleDisplayRules;
  metadata: ArticleMetadata;
  content: ArticleContent;
}

export interface ArticleDocument extends Article, Document {}

// --- Subschemas ---

const DisplayRulesSchema = new Schema<ArticleDisplayRules>(
  {
    hidden: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    showOnMainSite: { type: Boolean, default: true },
  },
  { _id: false }
);

const ArticleMetadataSchema = new Schema<ArticleMetadata>(
  {
    dateWritten: { type: Date, required: true },
    author: { type: String, required: true },
    editors: { type: [String], required: true, default: [] },
  },
  { _id: false }
);

const ArticleContentSchema = new Schema<ArticleContent>(
  {
    keywords: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    attachments: { type: [String], default: [] },
    landingImage: { type: String },
    content: { type: String, required: true },
  },
  { _id: false }
);

// --- Main Schema ---

export const ArticlesSchema: Schema<ArticleDocument> = new Schema({
  title: { type: String, required: true },
  articleId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
  },
  organisationId: { type: String, required: true, index: true },
  displayRules: { type: DisplayRulesSchema, required: true },
  metadata: { type: ArticleMetadataSchema, required: true },
  content: { type: ArticleContentSchema, required: true },
});

ArticlesSchema.index({ "metadata.author": 1 });
ArticlesSchema.index({ "metadata.editors": 1 });

const ArticleModel: Model<ArticleDocument> = mongoose.model<ArticleDocument>(
  "articles_collections",
  ArticlesSchema
);

export default ArticleModel;
