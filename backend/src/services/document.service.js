import { randomUUID } from "crypto";
import { createRequire } from "module";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { addAuditLog } from "./audit.service.js";
import { readStore, updateStore } from "./store.service.js";

const require = createRequire(import.meta.url);
const archiver = require("archiver");

// Mantem CNPJ/chave somente com digitos para comparacao e armazenamento uniforme.
function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

// Documento publico inclui flags calculadas para simplificar botoes da UI.
function asPublicDocument(document) {
  return {
    ...document,
    hasXml: Boolean(document.xml),
    pdfAvailable: Boolean(document.pdfAvailable || document.pdfPath || document.xml)
  };
}

// Lista documentos com filtros simples usados pelas telas.
// Novos filtros devem ser adicionados aqui para manter a API consistente.
export async function listDocuments(filters = {}) {
  const data = await readStore();
  let documents = data.documents;

  if (filters.companyId) {
    documents = documents.filter((item) => item.companyId === filters.companyId);
  }

  if (filters.type && filters.type !== "Todos") {
    documents = documents.filter((item) => item.type === filters.type);
  }

  if (filters.direction && filters.direction !== "Todos") {
    documents = documents.filter((item) => item.direction?.toLowerCase() === filters.direction.toLowerCase());
  }

  return documents.map(asPublicDocument);
}

// Busca documento bruto para downloads e geracao de DANFE.
export async function getDocumentById(id) {
  const data = await readStore();
  return data.documents.find((item) => item.id === id);
}

// Insere ou atualiza documentos capturados. A chave de deduplicacao prioriza
// accessKey e depois NSU + empresa, que sao os identificadores fiscais usuais.
export async function upsertDocuments(documents) {
  return updateStore((data) => {
    const saved = [];

    for (const document of documents) {
      const existingIndex = data.documents.findIndex((item) => (
        (document.accessKey && item.accessKey === document.accessKey) ||
        (document.nsu && item.nsu === document.nsu && item.companyId === document.companyId)
      ));
      const record = {
        id: document.id || randomUUID(),
        companyId: document.companyId,
        number: document.number || document.accessKey?.slice(-9) || String(Date.now()),
        type: document.type || "NF-e",
        direction: document.direction || "Entrada",
        issuer: document.issuer || "Documento capturado",
        cnpj: onlyDigits(document.cnpj || ""),
        date: document.date || new Date().toISOString().slice(0, 10),
        amount: Number(document.amount || 0),
        status: document.status || "Autorizada",
        manifestStatus: document.manifestStatus || "Pendente",
        company: document.company || "",
        accessKey: document.accessKey || "",
        source: document.source || "Captura",
        nsu: document.nsu || "",
        xml: document.xml || "",
        pdfPath: document.pdfPath || "",
        pdfAvailable: Boolean(document.pdfAvailable || document.xml),
        createdAt: document.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        data.documents[existingIndex] = { ...data.documents[existingIndex], ...record, id: data.documents[existingIndex].id };
        saved.push(data.documents[existingIndex]);
      } else {
        data.documents.unshift(record);
        saved.push(record);
      }
    }

    return saved.map(asPublicDocument);
  });
}

// Registra manifestacao de destinatario no documento salvo.
// A integracao real com evento SEFAZ deve ser encaixada antes do updateStore.
export async function manifestDocument(id, manifestStatus) {
  const updated = await updateStore((data) => {
    const index = data.documents.findIndex((item) => item.id === id);
    if (index < 0) {
      return null;
    }

    data.documents[index] = {
      ...data.documents[index],
      manifestStatus,
      manifestedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return data.documents[index];
  });

  if (updated) {
    await addAuditLog({
      title: "Manifestacao registrada",
      detail: `${updated.type} ${updated.number} | ${manifestStatus}`,
      type: "manifest",
      metadata: { documentId: id }
    });
  }

  return updated ? asPublicDocument(updated) : null;
}

// DANFE simples para teste operacional. Nao substitui DANFE fiscal oficial;
// quando houver XML real completo, pode ser trocado por gerador fiscal dedicado.
export function generateDanfePdfBuffer(document, xml = "") {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 36 });
    const stream = new PassThrough();
    const chunks = [];

    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    pdf.pipe(stream);

    pdf.fontSize(16).text("DANFE / Documento Fiscal", { align: "center" });
    pdf.moveDown();
    pdf.fontSize(10).text("Representacao simplificada gerada a partir dos dados armazenados no Safe NFe.");
    pdf.moveDown();
    pdf.fontSize(11);
    pdf.text(`Tipo: ${document.type || "-"}`);
    pdf.text(`Numero: ${document.number || "-"}`);
    pdf.text(`Chave: ${document.accessKey || "-"}`);
    pdf.text(`Empresa: ${document.company || "-"}`);
    pdf.text(`Emitente: ${document.issuer || "-"}`);
    pdf.text(`CNPJ: ${document.cnpj || "-"}`);
    pdf.text(`Data: ${document.date || "-"}`);
    pdf.text(`Valor: R$ ${Number(document.amount || 0).toFixed(2)}`);
    pdf.text(`Status: ${document.status || "-"}`);
    pdf.moveDown();
    pdf.fontSize(9).text("XML armazenado:", { underline: true });
    pdf.fontSize(7).text((xml || document.xml || "XML nao armazenado.").slice(0, 3500), {
      width: 520
    });
    pdf.end();
  });
}

// Monta arquivo individual para download. PDF e gerado sob demanda para evitar
// depender de arquivo fisico enquanto o storage definitivo nao existe.
export async function getDocumentFile(id, type) {
  const document = await getDocumentById(id);
  if (!document) {
    const error = new Error("Documento nao encontrado.");
    error.statusCode = 404;
    throw error;
  }

  if (type === "xml") {
    if (!document.xml) {
      const error = new Error("XML autorizado nao armazenado para este documento.");
      error.statusCode = 404;
      throw error;
    }
    return {
      filename: `${document.type}-${document.number}.xml`,
      contentType: "application/xml",
      buffer: Buffer.from(document.xml, "utf8")
    };
  }

  return {
    filename: `${document.type}-${document.number}.pdf`,
    contentType: "application/pdf",
    buffer: await generateDanfePdfBuffer(document)
  };
}

// Gera ZIP em memoria para download em lote. Para volumes altos, migrar para
// streaming direto na response ou job assincrono com storage.
export async function createZip(documentIds, type) {
  const data = await readStore();
  const selected = data.documents.filter((item) => documentIds.includes(item.id));

  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks = [];

    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    Promise.all(selected.map(async (document) => {
      if (type === "xml" && document.xml) {
        archive.append(document.xml, { name: `${document.type}-${document.number}.xml` });
      }

      if (type === "pdf") {
        archive.append(await generateDanfePdfBuffer(document), { name: `${document.type}-${document.number}.pdf` });
      }
    })).then(() => archive.finalize()).catch(reject);
  });
}
