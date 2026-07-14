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

function firstTag(xml = "", tag) {
  const match = String(xml).match(new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, "i"));
  return match?.[1]?.trim() || "";
}

function firstBlock(xml = "", tag) {
  return firstTag(xml, tag);
}

function firstAttribute(xml = "", tag, attribute) {
  const match = String(xml).match(new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*\\s${attribute}=["']([^"']+)["']`, "i"));
  return match?.[1]?.trim() || "";
}

function formatAccessKey(value = "") {
  const digits = onlyDigits(value);
  return digits ? digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim() : "";
}

function formatMoney(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function cleanXmlName(name = "") {
  return name.replace(/^\/+/, "").replace(/\/$/, "").split(/\s+/)[0].replace(/^\w+:/, "");
}

function xmlAttributes(tag = "") {
  const attributes = [];
  const attrPattern = /([\w:-]+)=["']([^"']*)["']/g;
  let match;

  while ((match = attrPattern.exec(tag))) {
    attributes.push({ name: match[1].replace(/^\w+:/, ""), value: match[2] });
  }

  return attributes;
}

// Monta uma lista detalhada dos valores encontrados no XML usando o caminho do
// elemento. Isso nao substitui um parser fiscal completo, mas garante que a
// DANFE operacional apresente todos os dados textuais recebidos no XML.
function flattenXmlFields(xml = "") {
  const fields = [];
  const stack = [];
  const tokens = String(xml).replace(/<\?xml[\s\S]*?\?>/gi, "").replace(/<!--[\s\S]*?-->/g, "").match(/<[^>]+>|[^<]+/g) || [];

  for (const token of tokens) {
    if (token.startsWith("</")) {
      stack.pop();
      continue;
    }

    if (token.startsWith("<")) {
      if (/^<!/.test(token)) {
        continue;
      }

      const selfClosing = /\/>$/.test(token);
      const name = cleanXmlName(token.slice(1, -1));
      if (!name) {
        continue;
      }

      stack.push(name);
      for (const attribute of xmlAttributes(token)) {
        fields.push({ path: `${stack.join(".")}.@${attribute.name}`, value: attribute.value });
      }
      if (selfClosing) {
        stack.pop();
      }
      continue;
    }

    const value = token.replace(/\s+/g, " ").trim();
    if (value) {
      fields.push({ path: stack.join("."), value });
    }
  }

  return fields;
}

function prettyXml(xml = "") {
  const tokens = String(xml).replace(/>\s+</g, "><").replace(/</g, "\n<").split("\n").filter(Boolean);
  let level = 0;

  return tokens.map((token) => {
    if (/^<\//.test(token)) {
      level = Math.max(level - 1, 0);
    }

    const line = `${"  ".repeat(level)}${token}`;

    if (/^<[^!?/][^>]*[^/]?>$/.test(token) && !token.includes("</")) {
      level += 1;
    }

    return line;
  }).join("\n");
}

function ensurePageSpace(pdf, y, needed = 18) {
  if (y + needed <= pdf.page.height - 42) {
    return y;
  }

  pdf.addPage();
  return 42;
}

function writeKeyValuePages(pdf, fields) {
  let y = 72;
  pdf.addPage();
  pdf.fontSize(13).fillColor("#0F172A").text("Campos detalhados do XML", 36, 36);

  for (const field of fields) {
    const value = String(field.value || "");
    const height = Math.max(22, pdf.heightOfString(value, { width: 300 }) + 10);
    y = ensurePageSpace(pdf, y, height);
    pdf.fontSize(7).fillColor("#64748B").text(field.path, 36, y, { width: 180 });
    pdf.fontSize(7).fillColor("#0F172A").text(value, 224, y, { width: 330 });
    y += height;
  }
}

function writeFullXmlPages(pdf, xml = "") {
  const xmlText = prettyXml(xml || "XML nao armazenado.");
  const lines = xmlText.split("\n");
  let y = 72;

  pdf.addPage();
  pdf.fontSize(13).fillColor("#0F172A").text("XML completo", 36, 36);
  pdf.font("Courier").fontSize(6).fillColor("#334155");

  for (const line of lines) {
    const height = Math.max(8, pdf.heightOfString(line, { width: 523 }) + 2);
    y = ensurePageSpace(pdf, y, height);
    pdf.text(line, 36, y, { width: 523 });
    y += height;
  }

  pdf.font("Helvetica");
}

// Extrai os campos fiscais mais importantes de um XML de NF-e sem depender de
// layout fixo da tela. Quando o XML real existir, o PDF usa essas informacoes
// em vez de apenas despejar texto bruto.
function extractFiscalData(document, xml = "") {
  const ide = firstBlock(xml, "ide");
  const emit = firstBlock(xml, "emit");
  const dest = firstBlock(xml, "dest");
  const totals = firstBlock(xml, "ICMSTot");
  const infNfeId = firstAttribute(xml, "infNFe", "Id").replace(/^NFe/i, "");
  const accessKey = document.accessKey || infNfeId || firstTag(xml, "chNFe");
  const issueDate = firstTag(ide, "dhEmi") || firstTag(ide, "dEmi") || document.date;

  return {
    type: document.type || (xml.includes("<NFe") ? "NF-e" : "Documento fiscal"),
    number: document.number || firstTag(ide, "nNF") || "-",
    serie: firstTag(ide, "serie") || "-",
    operation: firstTag(ide, "natOp") || "-",
    accessKey,
    formattedAccessKey: formatAccessKey(accessKey),
    issuer: document.issuer || firstTag(emit, "xNome") || "-",
    issuerCnpj: onlyDigits(document.cnpj || firstTag(emit, "CNPJ") || firstTag(emit, "CPF")),
    recipient: firstTag(dest, "xNome") || document.company || "-",
    recipientDocument: onlyDigits(firstTag(dest, "CNPJ") || firstTag(dest, "CPF")),
    date: issueDate ? new Date(issueDate).toLocaleString("pt-BR") : "-",
    amount: Number(firstTag(totals, "vNF") || document.amount || 0),
    status: document.status || "Autorizada",
    source: document.source || "Cofre local"
  };
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
    const fullXml = xml || document.xml || "";
    const fiscal = extractFiscalData(document, fullXml);
    const fields = flattenXmlFields(fullXml);
    const pdf = new PDFDocument({ size: "A4", margin: 36 });
    const stream = new PassThrough();
    const chunks = [];

    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    pdf.pipe(stream);

    const box = (x, y, width, height, title, value, options = {}) => {
      pdf.rect(x, y, width, height).stroke("#CBD5E1");
      pdf.fontSize(7).fillColor("#64748B").text(title, x + 6, y + 5, { width: width - 12 });
      pdf.fontSize(options.size || 9).fillColor("#0F172A").text(value || "-", x + 6, y + 18, { width: width - 12 });
    };

    pdf.fontSize(17).fillColor("#0F172A").text("DANFE / Documento Fiscal", 36, 34, { align: "center" });
    pdf.fontSize(8).fillColor("#475569").text("Representacao operacional gerada pelo Safe NFe a partir do XML armazenado.", 36, 58, { align: "center" });

    box(36, 84, 170, 48, "Tipo", fiscal.type);
    box(206, 84, 92, 48, "Numero", fiscal.number);
    box(298, 84, 72, 48, "Serie", fiscal.serie);
    box(370, 84, 189, 48, "Valor total", formatMoney(fiscal.amount), { size: 11 });

    box(36, 142, 523, 52, "Chave de acesso", fiscal.formattedAccessKey || fiscal.accessKey || "-", { size: 12 });
    box(36, 204, 255, 58, "Emitente", `${fiscal.issuer}\n${fiscal.issuerCnpj || "-"}`);
    box(304, 204, 255, 58, "Destinatario", `${fiscal.recipient}\n${fiscal.recipientDocument || "-"}`);
    box(36, 272, 255, 48, "Natureza da operacao", fiscal.operation);
    box(304, 272, 255, 48, "Emissao / Status", `${fiscal.date}\n${fiscal.status}`);

    pdf.fontSize(10).fillColor("#0F172A").text("Resumo tecnico", 36, 344);
    pdf.moveTo(36, 360).lineTo(559, 360).stroke("#CBD5E1");
    pdf.fontSize(8).fillColor("#334155");
    pdf.text(`Fonte: ${fiscal.source}`, 36, 374);
    pdf.text(`Arquivo XML armazenado: ${fullXml ? "Sim" : "Nao"}`, 36, 388);
    pdf.text(`Campos detalhados extraidos: ${fields.length}`, 36, 402);
    pdf.text("Observacao: use o XML autorizado como documento fiscal principal. Este PDF serve para consulta, conferencia e compartilhamento operacional.", 36, 424, { width: 523 });

    if (fields.length) {
      writeKeyValuePages(pdf, fields);
    }
    writeFullXmlPages(pdf, fullXml);
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
