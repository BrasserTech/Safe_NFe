import { randomUUID } from "crypto";
import { addAuditLog } from "./audit.service.js";
import { getCertificateForFiscalProvider } from "./certificate.service.js";
import { upsertDocuments } from "./document.service.js";
import { requestFiscalDocuments } from "./fiscal-provider.service.js";
import { readStore } from "./store.service.js";

function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

// Decide se a captura vai usar provedor real ou modo local.
// O valor vem do backend/.env:
// - SEFAZ_INTEGRATION_ENABLED=true para NF-e/CT-e/NFC-e/MDF-e.
// - NFSE_INTEGRATION_ENABLED=true para NFS-e.
function isRealIntegrationEnabled(source) {
  return source === "nfse"
    ? process.env.NFSE_INTEGRATION_ENABLED === "true"
    : process.env.SEFAZ_INTEGRATION_ENABLED === "true";
}

// Procura a empresa que o usuario escolheu na tela Captura.
// A UI envia normalmente o id interno, mas aceitar CNPJ facilita automacoes.
async function findCompany(companyIdOrCnpj) {
  const data = await readStore();
  const digits = onlyDigits(companyIdOrCnpj);
  return data.companies.find((company) => company.id === companyIdOrCnpj || onlyDigits(company.cnpj) === digits);
}

// Captura fiscal depende de certificado A1 vinculado a empresa.
// Sem isso a busca real na SEFAZ/Portal Nacional nao tem credencial.
async function assertCertificate(companyId) {
  const certificate = await getCertificateForFiscalProvider(companyId);
  if (!certificate) {
    const error = new Error("Vincule um certificado A1 valido antes de capturar documentos.");
    error.statusCode = 422;
    throw error;
  }
  return certificate;
}

// Executa a captura real por provedor contratado.
// A funcao chama o adaptador HTTP, recebe documentos normalizados, salva no
// cofre local e registra auditoria para mostrar que a operacao aconteceu.
async function captureWithProvider(kind, { company, certificate, payload, sourceLabel }) {
  const result = await requestFiscalDocuments(kind, {
    company,
    certificate,
    payload,
    sourceLabel
  });
  const saved = result.documents.length ? await upsertDocuments(result.documents) : [];

  // Auditoria e o historico operacional. Ela responde perguntas como:
  // "quem capturou?", "para qual empresa?", "qual provedor respondeu?".
  await addAuditLog({
    title: kind === "nfse" ? "Captura NFS-e real executada" : "Captura SEFAZ real executada",
    detail: `${saved.length} documento(s) para ${company.legalName}`,
    type: "capture",
    metadata: {
      companyId: company.id,
      provider: result.provider,
      status: result.status,
      payload
    }
  });

  return {
    mode: "real-provider",
    provider: result.provider,
    status: result.status,
    reason: result.message,
    saved_documents: saved
  };
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

// Entrada principal da captura SEFAZ.
// O payload vem da tela Captura: empresa, tipo de documento, UF, periodo,
// NSU/chave e opcoes de XML/PDF/manifestacao. Se a flag real estiver ligada,
// usa o provedor configurado; caso contrario, usa modo local de teste.
export async function captureSefazDistribution(payload) {
  const company = await findCompany(payload.companyId || payload.company);

  if (!company) {
    const error = new Error("Empresa/CNPJ nao encontrado.");
    error.statusCode = 404;
    throw error;
  }

  const certificate = await assertCertificate(company.id);

  // Caminho de producao: consulta o endpoint do provedor fiscal contratado.
  if (isRealIntegrationEnabled("sefaz")) {
    return captureWithProvider("sefaz", {
      company,
      certificate,
      payload,
      sourceLabel: "SEFAZ Distribuicao DFe"
    });
  }

  // Caminho local: cria um documento minimo apenas para testar telas, filtros,
  // downloads, PDF e auditoria sem depender de SEFAZ real.
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

// Entrada principal da captura NFS-e. Mantem o mesmo desenho da SEFAZ para que
// a tela Captura nao precise saber se a nota veio de prefeitura, gateway ou
// Portal Nacional. A escolha do endpoint fica no backend/.env.
export async function captureNfseNational(payload) {
  const company = await findCompany(payload.companyId || payload.company);

  if (!company) {
    const error = new Error("Empresa/CNPJ nao encontrado.");
    error.statusCode = 404;
    throw error;
  }

  const certificate = await assertCertificate(company.id);

  // Caminho de producao para NFS-e.
  if (isRealIntegrationEnabled("nfse")) {
    return captureWithProvider("nfse", {
      company,
      certificate,
      payload,
      sourceLabel: payload.source || "Portal Nacional NFS-e"
    });
  }

  // Caminho local para testar o fluxo de NFS-e sem provedor configurado.
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
