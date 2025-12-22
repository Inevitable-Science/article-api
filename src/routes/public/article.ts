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
      await UserModel.findOne({ userId: article.metadata.author }),
      await OrganisationModel.findOne({ organisationId: article.organisationId }),
    ]);

    const mappedArticle = {
      title: article.title,
      content: article.content,
      author: {
        username: author?.userMetadata.username || null,
        profilePicture: author?.userMetadata.profilePicture || null,
      },
      organisation: {
        name: organisation?.organisationName ?? null,
        organisationId: organisation?.organisationId ?? null,
        logo: organisation?.metadata.logo ?? null
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
      await OrganisationModel.findOne({ organisationId: parsed.data }),
      await ArticleModel.find({ organisationId: parsed.data })
    ]);

    if (!organisation) {
      res.status(404).json({ error: ErrorCodes.ELEMENT_NOT_FOUND });
      return;
    }

    const articlesMap = articles.map((article) => {
      return {
        title: article.title,
        articleId: article.articleId,
        landingImage: article.content.landingImage || null,
      }
    });

    res.status(200).json(articlesMap);
    return;
  } catch (err) {
    handleServerError(res, err);
  }
};