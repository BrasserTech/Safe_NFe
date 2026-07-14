import * as documentService from "../services/document.service.js";

// Lista documentos ja armazenados no cofre local.
export async function index(req, res, next) {
  try {
    res.json(await documentService.listDocuments(req.query));
  } catch (error) {
    next(error);
  }
}

// Download do XML autorizado armazenado. Retorna 404 quando a nota existe,
// mas ainda nao possui XML salvo.
export async function downloadXml(req, res, next) {
  try {
    const file = await documentService.getDocumentFile(req.params.id, "xml");
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  } catch (error) {
    next(error);
  }
}

// Download/geracao sob demanda de PDF/DANFE simplificado.
export async function downloadPdf(req, res, next) {
  try {
    const file = await documentService.getDocumentFile(req.params.id, "pdf");
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  } catch (error) {
    next(error);
  }
}

// Recebe XML por multipart e devolve uma pre-visualizacao de DANFE.
// Usado para integracoes futuras e testes manuais.
export async function danfeFromXml(req, res, next) {
  try {
    const xml = req.file?.buffer?.toString("utf8") || "";
    const buffer = await documentService.generateDanfePdfBuffer({
      type: "NF-e",
      number: "preview",
      issuer: "XML enviado",
      status: "Pre-visualizacao"
    }, xml);

    res.setHeader("Content-Type", "application/pdf");
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

// Gera ZIP para XML ou PDF a partir dos documentos selecionados na UI.
export async function downloadZip(req, res, next) {
  try {
    const buffer = await documentService.createZip(req.body.documentIds || [], req.body.type || "xml");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="documentos-${req.body.type || "xml"}.zip"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}
