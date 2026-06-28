import { Router } from "express";
import { index } from "../controllers/settings.controller.js";

const router = Router();

router.get("/", index);

export default router;
