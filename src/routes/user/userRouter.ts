import { Router } from "express";
//import { getNonceHandler, loginHandler } from "./auth";
import {
  createUserHandler,
  editUserHandler,
  getAllUserHandler,
  getUserHandler,
} from "./user";
import { loginPasswordHandler } from "./auth";

const router = Router();

// Auth
//router.get("/getNonce/:address", getNonceHandler);
//router.post("/login", loginHandler);
router.post("/login", loginPasswordHandler);

// User
router.post("/fetch", getUserHandler);
router.post("/create", createUserHandler);
router.post("/edit", editUserHandler);
router.get("/all", getAllUserHandler);

export default router;
