import { Router } from "express";
import { index, testDatabase } from "../controllers/settings.controller.js";

const router = Router();

router.get("/", index);
router.get("/database/test", testDatabase);

export default router;
