import { Router } from "express";
import { ctes, index, manifest, show } from "../controllers/invoice.controller.js";

const router = Router();

router.get("/invoices", index);
router.get("/invoices/:id", show);
router.post("/invoices/:id/manifest", manifest);
router.get("/ctes", ctes);

export default router;
