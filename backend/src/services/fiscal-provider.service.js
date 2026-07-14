import fs from "fs/promises";

function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

function boolEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  return value === "true";
}

function intEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function requiredUrl(kind) {
  const url = kind === "nfse" ? process.env.NFSE_PROVIDER_URL : process.env.SEFAZ_DISTRIBUTION_URL;

  if (!url) {
    const error = new Error("Integracao real habilitada, mas endpoint fiscal nao configurado no .env.");
    error.statusCode = 501;
    throw error;
  }

  return url;
}

function authHeader(kind) {
  const token = kind === "nfse" ? process.env.NFSE_PROVIDER_TOKEN : process.env.SEFAZ_PROVIDER_TOKEN;
  if (!token) {
    return {};
  }

  const header = kind === "nfse"
    ? process.env.NFSE_PROVIDER_AUTH_HEADER || "Authorization"
    : process.env.SEFAZ_PROVIDER_AUTH_HEADER || "Authorization";
  const value = token.startsWith("Bearer ") || header.toLowerCase() !== "authorization"
    ? token
    : `Bearer ${token}`;

  return { [header]: value };
}

async function certificatePayload(kind, certificate) {
  const sendCertificate = kind === "nfse"
    ? boolEnv("NFSE_PROVIDER_SEND_CERTIFICATE")
    : boolEnv("SEFAZ_PROVIDER_SEND_CERTIFICATE");

  const payload = {
    id: certificate.id,
    type: certificate.tipo,
    holder: certificate.titular,
    document: certificate.documento,
    expiresAt: certificate.validade
  };

  // Alguns provedores exigem receber o A1; outros usam certificado ja
  // cadastrado no painel deles. O envio do arquivo e controlado por flag para
  // evitar trafegar senha/certificado sem necessidade.
  if (sendCertificate) {
    payload.fileBase64 = await fs.readFile(certificate.filePath, "base64");
    payload.password = certificate.password;
  }

  return payload;
}

function extractDocumentList(responseBody) {
  if (Array.isArray(responseBody)) {
    return responseBody;
  }

  return responseBody.documents ||
    responseBody.documentos ||
    responseBody.saved_documents ||
    responseBody.data?.documents ||
    responseBody.data?.documentos ||
    [];
}

function normalizeDocument(raw, context) {
  const xml = raw.xml || raw.xmlContent || raw.conteudoXml || raw.procNFe || raw.rawXml || "";
  const accessKey = raw.accessKey || raw.chave || raw.chaveAcesso || raw.chNFe || raw.key || "";
  const type = raw.type || raw.tipo || raw.model || raw.modelo || context.payload.documentType || "NF-e";

  return {
    companyId: context.company.id,
    company: context.company.legalName,
    type: type === "Todos" ? "NF-e" : type,
    direction: raw.direction || raw.direcao || context.payload.direction || "Entrada",
    issuer: raw.issuer || raw.emitente || raw.emit?.xNome || raw.providerName || "",
    cnpj: onlyDigits(raw.cnpj || raw.emitenteCnpj || raw.emit?.cnpj || raw.emit?.CNPJ || ""),
    number: raw.number || raw.numero || raw.nNF || accessKey.slice(-9),
    accessKey,
    nsu: raw.nsu || raw.NSU || context.payload.nsu || "",
    date: raw.date || raw.data || raw.emissao || raw.dhEmi || new Date().toISOString().slice(0, 10),
    amount: Number(raw.amount || raw.valor || raw.valorTotal || raw.vNF || 0),
    status: raw.status || raw.situacao || "Autorizada",
    manifestStatus: raw.manifestStatus || raw.manifestacao || "Pendente",
    source: context.sourceLabel,
    xml,
    pdfPath: raw.pdfPath || raw.danfeUrl || "",
    pdfAvailable: Boolean(raw.pdfAvailable || raw.pdfPath || raw.danfeUrl || xml),
    providerMetadata: raw
  };
}

// Adaptador HTTP generico para provedores fiscais contratados. O contrato de
// entrada e propositalmente simples para aceitar gateways SEFAZ/NFS-e sem
// alterar UI ou services internos; a resposta e normalizada em documentos.
export async function requestFiscalDocuments(kind, { company, certificate, payload, sourceLabel }) {
  const url = requiredUrl(kind);
  const timeoutMs = intEnv(kind === "nfse" ? "NFSE_PROVIDER_TIMEOUT_MS" : "SEFAZ_PROVIDER_TIMEOUT_MS", 60000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const body = {
    company: {
      id: company.id,
      legalName: company.legalName,
      cnpj: onlyDigits(company.cnpj)
    },
    certificate: await certificatePayload(kind, certificate),
    query: payload
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(kind)
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const text = await response.text();
    const responseBody = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const error = new Error(responseBody.message || responseBody.error || `Provedor fiscal retornou HTTP ${response.status}.`);
      error.statusCode = response.status;
      error.providerResponse = responseBody;
      throw error;
    }

    const documents = extractDocumentList(responseBody).map((item) => normalizeDocument(item, {
      company,
      payload,
      sourceLabel
    }));

    return {
      provider: responseBody.provider || responseBody.provedor || kind,
      status: responseBody.status || "ok",
      message: responseBody.message || responseBody.mensagem || "",
      documents,
      raw: responseBody
    };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Tempo limite excedido ao consultar o provedor fiscal.");
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
