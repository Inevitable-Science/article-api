import { Router } from "express";

import { publicFetchAllArticlesHandler, publicFetchArticleHandler, publicFetchLatestArticles, publicOrgArticleHandler } from "./article";

const router = Router();

router.get("/articles", publicFetchAllArticlesHandler);
router.get("/articles/latest", publicFetchLatestArticles)
router.get("/article/id/:articleId", publicFetchArticleHandler);
router.get("/organisation/id/:organisationId", publicOrgArticleHandler);

export default router;