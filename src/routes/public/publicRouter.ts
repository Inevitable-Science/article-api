import { Router } from "express";

import { publicFetchArticleHandler } from "./article";

const router = Router();

router.get('/article/id/:articleId', publicFetchArticleHandler);
//router.get('/article/org/:articleId', fetchArticleHandler);

export default router;