import { Router } from "express";
import { getNonceHandler, loginHandler } from "./auth";
import {
  createUserHandler,
  editUserHandler,
  getAllUserHandler,
  getUserHandler,
} from "./user";

const router = Router();

// Auth
router.get("/getNonce/:address", getNonceHandler);
router.post("/login", loginHandler);

// User
router.post("/fetch", getUserHandler);
router.post("/create", createUserHandler);
router.post("/edit", editUserHandler);
router.get("/all", getAllUserHandler);

export default router;
