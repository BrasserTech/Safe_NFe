import { Router } from "express";
import multer from "multer";
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
router.post("/", store);
router.post("/from-certificate", upload.single("certificado"), createFromCertificate);
router.delete("/:id", destroy);
router.get("/:id/certificado", showCertificate);
router.post("/:id/certificado/testar", upload.single("certificado"), testCertificate);
router.post("/:id/certificado", upload.single("certificado"), storeCertificate);

export default router;
