import { Router } from "express";

import { publicFetchAllArticleHandler, publicFetchArticleHandler, publicOrgArticleHandler } from "./article";

const router = Router();

router.get("/articles", publicFetchAllArticleHandler);
router.get("/article/id/:articleId", publicFetchArticleHandler);
router.get("/organisation/id/:organisationId", publicOrgArticleHandler);

export default router;