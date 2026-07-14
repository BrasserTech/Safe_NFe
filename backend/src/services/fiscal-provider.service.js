import fs from "fs/promises";

// Remove pontuacao de CNPJ/CPF/chaves. Isso evita erro quando um provedor
// manda "12.345.678/0001-99" e outro manda "12345678000199".
function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

// Le flags do .env. Usamos texto "true" porque variaveis de ambiente sempre
// chegam como string, mesmo quando parecem booleanas.
function boolEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  return value === "true";
}

// Le tempos de espera do .env. Se alguem preencher valor invalido, o sistema
// usa o padrao seguro em vez de quebrar a captura.
function intEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

// Decide qual endpoint sera chamado. "sefaz" usa SEFAZ_DISTRIBUTION_URL;
// "nfse" usa NFSE_PROVIDER_URL. Esses valores vem do arquivo backend/.env.
function requiredUrl(kind) {
  const url = kind === "nfse" ? process.env.NFSE_PROVIDER_URL : process.env.SEFAZ_DISTRIBUTION_URL;

  if (!url) {
    const error = new Error("Integracao real habilitada, mas endpoint fiscal nao configurado no .env.");
    error.statusCode = 501;
    throw error;
  }

  return url;
}

// Monta o cabecalho de autenticacao do provedor contratado. Exemplo comum:
// Authorization: Bearer <token>. Se o provedor usar outro nome de header,
// ele pode ser configurado no .env sem alterar codigo.
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

// Prepara os dados do certificado que serao enviados ao provedor fiscal.
// Por padrao, envia somente metadados seguros. O arquivo A1 e a senha so
// seguem junto se *_PROVIDER_SEND_CERTIFICATE=true no .env.
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

// Provedores diferentes costumam devolver nomes diferentes para a lista de
// notas: documents, documentos, data.documents etc. Esta funcao aceita esses
// formatos para reduzir retrabalho quando trocar de provedor.
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

// Converte uma nota retornada pelo provedor para o formato interno do Safe NFe.
// Cada campo tenta varios nomes porque cada API fiscal pode usar uma convenção:
// "accessKey", "chave", "chaveAcesso" ou "chNFe", por exemplo.
function normalizeDocument(raw, context) {
  const xml = raw.xml || raw.xmlContent || raw.conteudoXml || raw.procNFe || raw.rawXml || "";
  const accessKey = raw.accessKey || raw.chave || raw.chaveAcesso || raw.chNFe || raw.key || "";
  const type = raw.type || raw.tipo || raw.model || raw.modelo || context.payload.documentType || "NF-e";

  return {
    // companyId/company nao vem do provedor. Eles vem da empresa selecionada na
    // tela de Captura e garantem que a nota fique vinculada ao cadastro correto.
    companyId: context.company.id,
    company: context.company.legalName,
    // type identifica se o documento e NF-e, CT-e, NFC-e, MDF-e ou NFS-e.
    type: type === "Todos" ? "NF-e" : type,
    // direction mostra se a nota e de entrada ou saida para a empresa.
    direction: raw.direction || raw.direcao || context.payload.direction || "Entrada",
    // issuer/cnpj sao dados do emitente. Quando nao vierem no topo da resposta,
    // tentamos ler estruturas comuns como raw.emit.xNome e raw.emit.CNPJ.
    issuer: raw.issuer || raw.emitente || raw.emit?.xNome || raw.providerName || "",
    cnpj: onlyDigits(raw.cnpj || raw.emitenteCnpj || raw.emit?.cnpj || raw.emit?.CNPJ || ""),
    // number/accessKey/nsu sao identificadores fiscais usados para consulta,
    // deduplicacao e rastreio posterior.
    number: raw.number || raw.numero || raw.nNF || accessKey.slice(-9),
    accessKey,
    nsu: raw.nsu || raw.NSU || context.payload.nsu || "",
    // date/amount/status alimentam a tabela de Documentos e o Dashboard.
    date: raw.date || raw.data || raw.emissao || raw.dhEmi || new Date().toISOString().slice(0, 10),
    amount: Number(raw.amount || raw.valor || raw.valorTotal || raw.vNF || 0),
    status: raw.status || raw.situacao || "Autorizada",
    // manifestStatus controla o botao de manifestacao na tela Documentos.
    manifestStatus: raw.manifestStatus || raw.manifestacao || "Pendente",
    // source registra de onde veio a nota para auditoria e suporte.
    source: context.sourceLabel,
    // xml e o documento fiscal principal. O PDF/DANFE detalhado e gerado a
    // partir desse XML quando o usuario clica em visualizar ou baixar PDF.
    xml,
    pdfPath: raw.pdfPath || raw.danfeUrl || "",
    pdfAvailable: Boolean(raw.pdfAvailable || raw.pdfPath || raw.danfeUrl || xml),
    // providerMetadata guarda a resposta original para diagnostico tecnico.
    // Isso ajuda suporte sem perder informacoes especificas do provedor.
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

  // Corpo enviado ao provedor:
  // - company: empresa escolhida na tela Captura.
  // - certificate: certificado vinculado na tela Empresas > Certificado A1.
  // - query: filtros preenchidos pelo usuario, como UF, NSU, chave e periodo.
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
    // Esta e a chamada externa real. Se o endpoint/token estiver errado,
    // o erro aparece para a tela e tambem pode ser investigado nos logs.
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

    // Quando o provedor retorna erro HTTP, mantemos a mensagem dele para que
    // o usuario ou suporte saiba se faltou token, certificado, permissao etc.
    if (!response.ok) {
      const error = new Error(responseBody.message || responseBody.error || `Provedor fiscal retornou HTTP ${response.status}.`);
      error.statusCode = response.status;
      error.providerResponse = responseBody;
      throw error;
    }

    // Depois da resposta bem-sucedida, convertemos tudo para o formato unico
    // do Safe NFe antes de salvar no cofre.
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
