import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import forge from "node-forge";
import { companies } from "../mocks/companies.mock.js";

const savedCertificates = new Map();
const allowedExtensions = new Set([".pfx", ".p12"]);
const storageRoot = path.resolve(process.cwd(), "storage", "certificates");

function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

function findCompany(companyId) {
  const company = companies.find((item) => item.id === companyId || String(item.chave) === companyId);

  if (!company) {
    const error = new Error("Empresa nao encontrada.");
    error.statusCode = 404;
    throw error;
  }

  return company;
}

function assertCertificateFile(file) {
  if (!file) {
    const error = new Error("Envie um certificado digital.");
    error.statusCode = 400;
    throw error;
  }

  const extension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    const error = new Error("O certificado deve estar nos formatos .pfx ou .p12.");
    error.statusCode = 400;
    throw error;
  }
}

function readPkcs12(buffer, password) {
  try {
    const der = forge.util.createBuffer(buffer.toString("binary"), "binary");
    const asn1 = forge.asn1.fromDer(der);
    return forge.pkcs12.pkcs12FromAsn1(asn1, false, password || "");
  } catch (_error) {
    const error = new Error("Senha incorreta ou certificado invalido.");
    error.statusCode = 400;
    error.certificateStatus = "senha_incorreta";
    throw error;
  }
}

function getCertificateBag(p12) {
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const bag = certBags.find((item) => item.cert);

  if (!bag) {
    const error = new Error("Nao foi possivel localizar o certificado no arquivo enviado.");
    error.statusCode = 400;
    error.certificateStatus = "invalido";
    throw error;
  }

  return bag.cert;
}

function subjectValue(certificate, names) {
  for (const name of names) {
    const field = certificate.subject.getField(name);
    if (field?.value) {
      return field.value;
    }
  }

  return "";
}

function extractDocument(certificate) {
  const subjectText = certificate.subject.attributes.map((attribute) => attribute.value).join(" ");
  const extensionText = certificate.extensions
    ?.map((extension) => JSON.stringify(extension))
    .join(" ") || "";
  const searchText = `${subjectText} ${extensionText}`;
  const cnpjMatch = searchText.match(/\d{14}/);
  const cpfMatch = searchText.match(/\d{11}/);

  return cnpjMatch?.[0] || cpfMatch?.[0] || "";
}

function certificateInfo(certificate) {
  const now = new Date();
  const expiresAt = certificate.validity.notAfter;
  const expired = expiresAt.getTime() < now.getTime();

  return {
    titular: subjectValue(certificate, ["CN", "commonName"]) || "Titular nao identificado",
    documento: extractDocument(certificate),
    validade: expiresAt.toISOString(),
    status: expired ? "vencido" : "valido"
  };
}

function validateCertificatePayload(file, password) {
  assertCertificateFile(file);

  if (!password) {
    const error = new Error("Informe a senha do certificado.");
    error.statusCode = 400;
    throw error;
  }

  const p12 = readPkcs12(file.buffer, password);
  const certificate = getCertificateBag(p12);
  return certificateInfo(certificate);
}

function encryptPassword(password) {
  const secret = process.env.CERTIFICATE_SECRET || process.env.JWT_SECRET || "fiscalvault-development-secret";
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function testCertificate(companyId, file, password) {
  findCompany(companyId);
  const info = validateCertificatePayload(file, password);

  return {
    valid: info.status === "valido",
    certificate: info
  };
}

export async function saveCertificate(companyId, file, password) {
  const company = findCompany(companyId);
  const info = validateCertificatePayload(file, password);

  if (info.status === "vencido") {
    const error = new Error("Certificado vencido. Envie um certificado valido para salvar.");
    error.statusCode = 422;
    throw error;
  }

  const companyDocument = onlyDigits(company.cnpj);
  if (!info.documento) {
    const error = new Error("Nao foi possivel identificar o CNPJ/CPF no certificado.");
    error.statusCode = 422;
    throw error;
  }

  if (info.documento !== companyDocument) {
    const error = new Error("O CNPJ/CPF do certificado nao corresponde ao CNPJ da empresa selecionada.");
    error.statusCode = 422;
    throw error;
  }

  await fs.mkdir(storageRoot, { recursive: true });
  const extension = path.extname(file.originalname).toLowerCase();
  const filename = `${companyId}-${Date.now()}${extension}`;
  const destination = path.join(storageRoot, filename);
  await fs.writeFile(destination, file.buffer);

  const record = {
    empresaId: companyId,
    caminhoArquivo: destination,
    senhaCriptografada: encryptPassword(password),
    titular: info.titular,
    documento: info.documento,
    validade: info.validade,
    tipo: "A1",
    status: info.status,
    criadoEm: new Date().toISOString()
  };

  savedCertificates.set(companyId, record);

  return {
    message: "Certificado salvo com sucesso.",
    certificate: {
      empresaId: record.empresaId,
      caminhoArquivo: record.caminhoArquivo,
      titular: record.titular,
      documento: record.documento,
      validade: record.validade,
      tipo: record.tipo,
      status: record.status,
      criadoEm: record.criadoEm
    }
  };
}

export function getCurrentCertificate(companyId) {
  findCompany(companyId);
  const record = savedCertificates.get(companyId);

  if (!record) {
    return null;
  }

  return {
    empresaId: record.empresaId,
    caminhoArquivo: record.caminhoArquivo,
    titular: record.titular,
    documento: record.documento,
    validade: record.validade,
    tipo: record.tipo,
    status: record.status,
    criadoEm: record.criadoEm
  };
}
