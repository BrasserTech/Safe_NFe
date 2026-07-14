import { Router } from "express";
import { nfseNational, sefazDistribution } from "../controllers/capture.controller.js";

const router = Router();

router.post("/sefaz-distribution", sefazDistribution);
router.post("/nfse-national", nfseNational);

export default router;
