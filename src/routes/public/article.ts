// /articles - all articles on inev site
// /articles/:organisation - all articles on organisation site
// /articles/id/:articleId - fetch article

import type { Request, Response } from "express";
import z from "zod";

import ArticleModel from "@/src/database/articleSchema";
import { handleServerError } from "@/src/utils/errors/errorHandler";
import { ErrorCodes } from "@/src/utils/errors/errors";


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

    const mappedArticle = {
      
    }
  } catch (err) {
    handleServerError(res, err);
  }
}