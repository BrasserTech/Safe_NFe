import { Router } from "express";
import { requireRole } from "../middlewares/authMiddleware.js";
import { nfseNational, sefazDistribution } from "../controllers/capture.controller.js";

const router = Router();

router.post("/sefaz-distribution", requireRole("ADMIN"), sefazDistribution);
router.post("/nfse-national", requireRole("ADMIN"), nfseNational);

export default router;
