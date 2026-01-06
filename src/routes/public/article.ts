// /articles - all articles on inev site
// /articles/:organisation - all articles on organisation site
// /articles/id/:articleId - fetch article

import type { Request, Response } from "express";
import z from "zod";

import ArticleModel from "../../../src/database/articleSchema";
import { handleServerError } from "../../../src/utils/errors/errorHandler";
import { ErrorCodes } from "../../../src/utils/errors/errors";
import UserModel from "../../../src/database/userSchema";
import OrganisationModel from "../../../src/database/organisationSchema";
import { htmlToText, sliceToWord } from "../../utils/utils";


export const ArticleSchemaZ = z.object({
  title: z.string(),
  content: z.object({
    keywords: z.array(z.string()),
    tags: z.array(z.string()),
    landingImage: z.string(),
    content: z.string()
  }),
  author: z.object({
    username: z.string().nullable(),
    profilePicture: z.string().nullable(),
    dateWritten: z.union([z.string(), z.date()])
  }),
  organisation: z.object({
    name: z.string(),
    organisationId: z.string(),
    logo: z.string().nullable()
  }),
});

export async function publicFetchArticleHandler(req: Request, res: Response): Promise<void> {
  try {
    const articleId = req.params.articleId;
    const parsed = z.string().safeParse(articleId);

    if (!parsed.success) {
      res.status(400).json({ error: ErrorCodes.BAD_REQUEST });
      return;
    };

    const article = await ArticleModel.findOne({ articleId: parsed.data });
    if (!article || article.displayRules.deleted || article.displayRules.hidden) {
      res.status(404).json({ error: ErrorCodes.ELEMENT_NOT_FOUND });
      return;
    }

    const [author, organisation] = await Promise.all([
      UserModel.findOne({ userId: article.metadata.author }),
      OrganisationModel.findOne({ organisationId: article.organisationId }),
    ]);

    const overview = `${sliceToWord(
      htmlToText(article.content.content),
      130
    )}...`;

    const mappedArticle = {
      title: article.title,
      overview,
      content: article.content,
      author: {
        username: author?.userMetadata.username || null,
        profilePicture: author?.userMetadata.profilePicture || null,
        dateWritten: article.metadata.dateWritten
      },
      organisation: {
        name: organisation?.organisationName,
        organisationId: organisation?.organisationId,
        logo: organisation?.metadata.logo || null
      },
    };

    res.status(200).json(mappedArticle);
    return;
  } catch (err) {
    handleServerError(res, err);
  }
};



export async function publicOrgArticleHandler(req: Request, res: Response): Promise<void> {
  try {
    const organisationId = req.params.organisationId;
    const parsed = z.string().safeParse(organisationId);

    if (!parsed.success) {
      res.status(400).json({ error: ErrorCodes.BAD_REQUEST });
      return;
    };

    const [organisation, articles] = await Promise.all([
      OrganisationModel.findOne({ organisationId: parsed.data }),
      ArticleModel.find({ organisationId: parsed.data })
    ]);

    if (!organisation) {
      res.status(404).json({ error: ErrorCodes.ELEMENT_NOT_FOUND });
      return;
    }

    const filteredArticles = articles.filter(article => !article.displayRules.deleted && !article.displayRules.hidden);

    const articlesMap = filteredArticles.map((article) => {
      if (article.displayRules.deleted || article.displayRules.hidden) return;

      return {
        title: article.title,
        datePublished: article.metadata.dateWritten,
        articleId: article.articleId,
        landingImage: article.content.landingImage || null,
        keywords: article.content.keywords,
        tags: article.content.tags
      }
    });

    res.status(200).json(articlesMap);
    return;
  } catch (err) {
    handleServerError(res, err);
  }
};


interface OrgArrayType {
  organisationName: string | null;
  organisationId: string;
  metadata: {
    logo: string;
    description: string;
    website: string;
    x: string;
    discord: string;
  };
}

export async function publicFetchAllArticlesHandler(req: Request, res: Response): Promise<void> {
  try {
    const articles =  await ArticleModel.find({
      'displayRules.showOnMainSite': true,
      'displayRules.hidden': false,
      'displayRules.deleted': false
    });
    
    const uniqueOrgsIds = [
      ...new Set(articles.map(article => article.organisationId))
    ];

    
    const orgArray: OrgArrayType[] = [];
    for (const orgId of uniqueOrgsIds) {
      const org = await OrganisationModel.findOne({ organisationId: orgId.toLowerCase() });
      
      if (!org) continue;
      
      const constructedOrg = {
        organisationName: org.organisationName ?? null,
        organisationId: org.organisationId,
        metadata: org.metadata,
      }

      orgArray.push(constructedOrg)
    };

    const articlesMap = articles.map((article) => {
      const correspondingOrg = orgArray.find(org => org.organisationId.toLowerCase() === article.organisationId.toLowerCase());

      const overview = `${sliceToWord(
        htmlToText(article.content.content),
        130
      )}...`;

      return {
        title: article.title,
        datePublished: article.metadata.dateWritten,
        articleId: article.articleId,
        landingImage: article.content.landingImage || null,
        overview: overview ?? null,
        keywords: article.content.keywords,
        tags: article.content.tags,
        organisation: correspondingOrg ?? null,
      }
    });

    res.status(200).json(articlesMap);
    return;
  } catch (err) {
    handleServerError(res, err);
  }
};


export async function publicFetchLatestArticles(req: Request, res: Response): Promise<void> {
  try {
    const fetchedArticles =  await ArticleModel
      .find({
        'displayRules.showOnMainSite': true,
        'displayRules.hidden': false,
        'displayRules.deleted': false
      })
      .sort({ 'metadata.dateWritten': -1 })
      .limit(6);

    const articles = fetchedArticles.map((article) => {
      const overview = `${sliceToWord(
        htmlToText(article.content.content),
        130
      )}...`;

      return {
        title: article.title,
        articleId: article.articleId,
        landingImage: article.content.landingImage || null,
        overview: overview ?? null,
      }
    });

    res.status(200).json(articles);
    return;
  } catch (err) {
    handleServerError(res, err);
  }
};