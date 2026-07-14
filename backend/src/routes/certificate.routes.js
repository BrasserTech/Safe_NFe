import { Router } from "express";
import multer from "multer";
import { createFromCertificate, index, validateStandalone } from "../controllers/certificate.controller.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

router.get("/", index);
router.post("/validate", upload.single("certificado"), validateStandalone);
router.post("/from-certificate", upload.single("certificado"), createFromCertificate);

export default router;
