import { Router } from "express";
import { index, store } from "../controllers/company.controller.js";

const router = Router();

router.get("/", index);
router.post("/", store);

export default router;
