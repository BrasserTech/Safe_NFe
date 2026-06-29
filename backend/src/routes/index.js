import { Router } from "express";
import accountantRoutes from "./accountant.routes.js";
import authRoutes from "./auth.routes.js";
import companyRoutes from "./company.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import invoiceRoutes from "./invoice.routes.js";
import reportRoutes from "./report.routes.js";
import settingsRoutes from "./settings.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "FiscalVault API",
    timestamp: new Date().toISOString()
  });
});

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/", invoiceRoutes);
router.use("/companies", companyRoutes);
router.use("/empresas", companyRoutes);
router.use("/reports", reportRoutes);
router.use("/accountant", accountantRoutes);
router.use("/settings", settingsRoutes);

export default router;
