import { Router } from "express";
import { companiesIndex } from "../controllers/accountant.controller.js";

const router = Router();

router.get("/companies", companiesIndex);

export default router;
