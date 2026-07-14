import { Router } from "express";
import multer from "multer";
import { requireRole } from "../middlewares/authMiddleware.js";
import { createFromCertificate, show as showCertificate, store as storeCertificate, test as testCertificate } from "../controllers/certificate.controller.js";
import { destroy, index, store } from "../controllers/company.controller.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

router.get("/", index);
router.post("/", requireRole("ADMIN"), store);
router.post("/from-certificate", requireRole("ADMIN"), upload.single("certificado"), createFromCertificate);
router.delete("/:id", requireRole("ADMIN"), destroy);
router.get("/:id/certificado", showCertificate);
router.post("/:id/certificado/testar", requireRole("ADMIN"), upload.single("certificado"), testCertificate);
router.post("/:id/certificado", requireRole("ADMIN"), upload.single("certificado"), storeCertificate);

export default router;
