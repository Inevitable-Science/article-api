import { Router } from "express";

import { publicFetchArticleHandler, publicOrgArticleHandler } from "./article";

const router = Router();

router.get('/article/id/:articleId', publicFetchArticleHandler);
router.get('/organisation/id/:organisationId', publicOrgArticleHandler);

export default router;