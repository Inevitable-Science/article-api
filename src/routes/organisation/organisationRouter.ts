import { Router } from "express";
import {
  createOrgHandler,
  editOrgHandler,
  fetchOrgHandler,
} from "./organisation";

const router = Router();

router.get("/:organisationId", fetchOrgHandler);
router.post("/create", createOrgHandler);
router.post("/edit/:organisationId", editOrgHandler);

export default router;
