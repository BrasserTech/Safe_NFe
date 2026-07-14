import { randomUUID } from "crypto";
import { addAuditLog } from "./audit.service.js";
import { upsertDocuments } from "./document.service.js";
import { readStore } from "./store.service.js";

function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

// Protecao contra falso positivo em producao:
// quando a flag real estiver ligada, exigimos endpoint/adaptador fiscal.
// Enquanto nao houver adaptador contratado, a API falha explicitamente.
function assertRealAdapterConfigured(source) {
  const enabled = source === "nfse"
    ? process.env.NFSE_INTEGRATION_ENABLED === "true"
    : process.env.SEFAZ_INTEGRATION_ENABLED === "true";

  if (!enabled) {
    return false;
  }

  const url = source === "nfse" ? process.env.NFSE_PROVIDER_URL : process.env.SEFAZ_DISTRIBUTION_URL;
  if (!url) {
    const error = new Error("Integracao real habilitada, mas endpoint fiscal nao configurado no .env.");
    error.statusCode = 501;
    throw error;
  }

  const error = new Error("Adaptador fiscal real ainda nao implementado. Configure o provedor SEFAZ/NFS-e antes de usar em producao.");
  error.statusCode = 501;
  throw error;
}

// Aceita tanto id interno quanto CNPJ para facilitar chamadas vindas da UI.
async function findCompany(companyIdOrCnpj) {
  const data = await readStore();
  const digits = onlyDigits(companyIdOrCnpj);
  return data.companies.find((company) => company.id === companyIdOrCnpj || onlyDigits(company.cnpj) === digits);
}

// Captura fiscal depende de certificado A1 vinculado a empresa.
// Sem isso a busca real na SEFAZ/Portal Nacional nao tem credencial.
async function assertCertificate(companyId) {
  const data = await readStore();
  const certificate = data.certificates.find((item) => item.companyId === companyId);
  if (!certificate) {
    const error = new Error("Vincule um certificado A1 valido antes de capturar documentos.");
    error.statusCode = 422;
    throw error;
  }
  return certificate;
}

// Gera um XML minimo para testar o fluxo local completo.
// Substituir por XML retornado pela SEFAZ/NFS-e no adaptador real.
function sampleXml(payload, company, type) {
  const accessKey = payload.accessKey || `${payload.ufCode || "42"}${Date.now()}${Math.floor(Math.random() * 999999)}`;
  return {
    accessKey,
    xml: `<?xml version="1.0" encoding="UTF-8"?><SafeNFeDocumento><tipo>${type}</tipo><chave>${accessKey}</chave><cnpj>${company.cnpj}</cnpj><empresa>${company.legalName}</empresa><ambiente>${payload.environment || "Producao"}</ambiente><capturadoEm>${new Date().toISOString()}</capturadoEm></SafeNFeDocumento>`
  };
}

// Contrato da captura SEFAZ. Hoje persiste um documento local para validar
// fluxo de cofre; a troca por consulta real deve acontecer antes do upsert.
export async function captureSefazDistribution(payload) {
  assertRealAdapterConfigured("sefaz");
  const company = await findCompany(payload.companyId || payload.company);

  if (!company) {
    const error = new Error("Empresa/CNPJ nao encontrado.");
    error.statusCode = 404;
    throw error;
  }

  await assertCertificate(company.id);

  const type = payload.documentType === "Todos" ? "NF-e" : payload.documentType;
  const generated = sampleXml(payload, company, type);
  const saved = await upsertDocuments([
    {
      id: randomUUID(),
      companyId: company.id,
      company: company.legalName,
      type,
      direction: payload.direction || "Entrada",
      issuer: payload.direction === "Saida" ? company.legalName : "Fornecedor capturado",
      cnpj: payload.direction === "Saida" ? company.cnpj : "00000000000191",
      number: generated.accessKey.slice(-9),
      accessKey: generated.accessKey,
      nsu: payload.nsu || String(Date.now()),
      date: new Date().toISOString().slice(0, 10),
      amount: 1250.75,
      status: "Autorizada",
      manifestStatus: payload.manifest ? "Ciencia da operacao" : "Pendente",
      source: "SEFAZ Distribuicao DFe",
      xml: generated.xml,
      pdfAvailable: true
    }
  ]);

  await addAuditLog({
    title: "Captura SEFAZ executada",
    detail: `${saved.length} documento(s) para ${company.legalName}`,
    type: "capture",
    metadata: { companyId: company.id, payload }
  });

  return {
    mode: "local-ready",
    reason: "Documento salvo no cofre em modo local. Para consulta real, configure SEFAZ_INTEGRATION_ENABLED e o adaptador fiscal.",
    saved_documents: saved
  };
}

// Contrato da captura NFS-e. Mantem o mesmo comportamento da SEFAZ para a UI,
// permitindo evoluir provedores municipais sem alterar as telas.
export async function captureNfseNational(payload) {
  assertRealAdapterConfigured("nfse");
  const company = await findCompany(payload.companyId || payload.company);

  if (!company) {
    const error = new Error("Empresa/CNPJ nao encontrado.");
    error.statusCode = 404;
    throw error;
  }

  await assertCertificate(company.id);
  const generated = sampleXml(payload, company, "NFS-e");
  const saved = await upsertDocuments([
    {
      id: randomUUID(),
      companyId: company.id,
      company: company.legalName,
      type: "NFS-e",
      direction: payload.direction || "Entrada",
      issuer: "Prestador capturado",
      cnpj: "00000000000191",
      number: generated.accessKey.slice(-8),
      accessKey: generated.accessKey,
      date: new Date().toISOString().slice(0, 10),
      amount: 890.35,
      status: "Autorizada",
      source: "Portal Nacional NFS-e",
      xml: generated.xml,
      pdfAvailable: true
    }
  ]);

  await addAuditLog({
    title: "Captura NFS-e executada",
    detail: `${saved.length} documento(s) para ${company.legalName}`,
    type: "capture",
    metadata: { companyId: company.id, payload }
  });

  return {
    mode: "local-ready",
    reason: "Documento NFS-e salvo no cofre em modo local. Configure provedor municipal/nacional para producao.",
    saved_documents: saved
  };
}
