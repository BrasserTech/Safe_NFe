import { Router } from "express";
import { requireRole } from "../middlewares/authMiddleware.js";
import { ctes, index, manifest, show } from "../controllers/invoice.controller.js";

const router = Router();

router.get("/invoices", index);
router.get("/invoices/:id", show);
router.post("/invoices/:id/manifest", requireRole("ADMIN"), manifest);
router.get("/ctes", ctes);

export default router;
