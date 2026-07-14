import { Router } from "express";
import multer from "multer";
import { danfeFromXml, downloadPdf, downloadXml, downloadZip, index } from "../controllers/document.controller.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.XML_UPLOAD_LIMIT_BYTES || 10 * 1024 * 1024)
  },
  fileFilter(_req, file, callback) {
    const allowed = file.originalname.toLowerCase().endsWith(".xml") ||
      ["application/xml", "text/xml"].includes(file.mimetype);

    if (!allowed) {
      const error = new Error("Envie um arquivo XML valido.");
      error.statusCode = 400;
      return callback(error);
    }

    return callback(null, true);
  }
});

router.get("/", index);
router.get("/:id/xml", downloadXml);
router.get("/:id/pdf", downloadPdf);
router.post("/danfe", upload.single("file"), danfeFromXml);
router.post("/download-zip", downloadZip);

export default router;
