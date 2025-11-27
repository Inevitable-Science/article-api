import { Router } from "express";
import { createArticleHandler, deleteArticleHandler, editArticleHandler, fetchArticleHandler } from "./article";

const router = Router();

router.get('/fetch/:articleId', fetchArticleHandler);

router.post('/create', createArticleHandler);
router.post('/edit/:articleId', editArticleHandler);
router.post('/delete', deleteArticleHandler);

export default router;