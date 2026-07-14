import { Router } from "express";
import accountantRoutes from "./accountant.routes.js";
import auditRoutes from "./audit.routes.js";
import authRoutes from "./auth.routes.js";
import captureRoutes from "./capture.routes.js";
import certificateRoutes from "./certificate.routes.js";
import companyRoutes from "./company.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import documentRoutes from "./document.routes.js";
import invoiceRoutes from "./invoice.routes.js";
import reportRoutes from "./report.routes.js";
import settingsRoutes from "./settings.routes.js";

const router = Router();

// Endpoint leve para monitoramento local e validacao de deploy.
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "FiscalVault API",
    timestamp: new Date().toISOString()
  });
});

// Rotas agrupadas por dominio. As rotas legadas em portugues foram mantidas
// para compatibilidade com as telas existentes.
router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/", invoiceRoutes);
router.use("/documents", documentRoutes);
router.use("/capture", captureRoutes);
router.use("/certificates", certificateRoutes);
router.use("/companies", companyRoutes);
router.use("/empresas", companyRoutes);
router.use("/reports", reportRoutes);
router.use("/accountant", accountantRoutes);
router.use("/settings", settingsRoutes);
router.use("/audit", auditRoutes);

export default router;
