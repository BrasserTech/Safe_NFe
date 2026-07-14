import { Router } from "express";
import multer from "multer";
import { danfeFromXml, downloadPdf, downloadXml, downloadZip, index } from "../controllers/document.controller.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", index);
router.get("/:id/xml", downloadXml);
router.get("/:id/pdf", downloadPdf);
router.post("/danfe", upload.single("file"), danfeFromXml);
router.post("/download-zip", downloadZip);

export default router;
