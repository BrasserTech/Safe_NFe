import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import forge from "node-forge";
import { addAuditLog } from "./audit.service.js";
import { createCompany, getCompanyById } from "./company.service.js";
import { dataRoot, readStore, updateStore } from "./store.service.js";

const allowedExtensions = new Set([".pfx", ".p12"]);
const storageRoot = path.join(dataRoot, "certificates");

// Certificados fiscais usam apenas digitos para comparacao entre CNPJ do
// cadastro e documento encontrado dentro do A1.
function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

// Busca a empresa no armazenamento antes de qualquer operacao sensivel com
// certificado. Isso impede salvar certificado solto sem vinculo fiscal.
async function findCompany(companyId) {
  const company = await getCompanyById(companyId);

  if (!company) {
    const error = new Error("Empresa nao encontrada.");
    error.statusCode = 404;
    throw error;
  }

  return company;
}

// Garante que o upload recebido e um certificado A1 nos formatos esperados.
// A senha e validada depois ao abrir o PKCS#12.
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

// Abre o arquivo PKCS#12. Erros aqui normalmente significam senha incorreta,
// arquivo corrompido ou arquivo que nao e um certificado A1 valido.
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

// Extrai o primeiro certificado dentro do container PKCS#12.
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

// Alguns certificados usam nomes diferentes para os mesmos atributos.
// Esta funcao tenta as alternativas conhecidas em ordem.
function subjectValue(certificate, names) {
  for (const name of names) {
    const field = certificate.subject.getField(name);
    if (field?.value) {
      return field.value;
    }
  }

  return "";
}

// O CNPJ/CPF pode aparecer em atributos ou extensoes do certificado.
// A extração e conservadora: procura primeiro 14 digitos, depois 11.
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

// Converte o certificado lido pelo node-forge para o formato usado pela API.
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

// Valida arquivo e senha e devolve metadados seguros para exibir na tela.
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

// Criptografa a senha do certificado para armazenamento local.
// Em producao, preferir KMS/secret manager e rotacao de chave.
function encryptPassword(password) {
  const secret = process.env.CERTIFICATE_SECRET || process.env.JWT_SECRET || "fiscalvault-development-secret";
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

function decryptPassword(encryptedPassword) {
  const secret = process.env.CERTIFICATE_SECRET || process.env.JWT_SECRET || "fiscalvault-development-secret";
  const key = crypto.createHash("sha256").update(secret).digest();
  const [ivHex, tagHex, encryptedHex] = String(encryptedPassword || "").split(":");

  if (!ivHex || !tagHex || !encryptedHex) {
    const error = new Error("Senha do certificado nao esta disponivel para integracao fiscal.");
    error.statusCode = 500;
    throw error;
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final()
  ]).toString("utf8");
}

// Teste vinculado a uma empresa: valida o certificado e confirma que a empresa
// existe antes de liberar a resposta.
export function testCertificate(companyId, file, password) {
  return findCompany(companyId).then(() => {
    const info = validateCertificatePayload(file, password);

    return {
      valid: info.status === "valido",
      certificate: info
    };
  });
}

// Validação avulsa usada pela tela Certificados antes do vínculo definitivo.
export function validateCertificate(file, password) {
  const info = validateCertificatePayload(file, password);

  return {
    valid: info.status === "valido",
    certificate: info,
    cnpj: info.documento,
    expiration_date: info.validade
  };
}

// Salva o arquivo A1, criptografa a senha e atualiza o status da empresa.
// Esta funcao e o ponto principal para integrar storage S3 futuramente.
export async function saveCertificate(companyId, file, password) {
  const company = await findCompany(companyId);
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
  // mode 0o600 restringe leitura/escrita ao usuario do processo em sistemas
  // compatíveis. Em Windows, a proteção principal continua sendo pasta local
  // fora do Git e criptografia da senha do certificado.
  await fs.writeFile(destination, file.buffer, { mode: 0o600 });

  const record = {
    id: crypto.randomUUID(),
    companyId: company.id,
    filePath: destination,
    encryptedPassword: encryptPassword(password),
    titular: info.titular,
    documento: info.documento,
    validade: info.validade,
    tipo: "A1",
    status: info.status,
    criadoEm: new Date().toISOString()
  };

  await updateStore((data) => {
    data.certificates = data.certificates.filter((item) => item.companyId !== company.id);
    data.certificates.unshift(record);
    data.companies = data.companies.map((item) => item.id === company.id
      ? {
          ...item,
          certificateLabel: `A1 valido ate ${new Intl.DateTimeFormat("pt-BR").format(new Date(record.validade))}`,
          status: "Ativa",
          updatedAt: new Date().toISOString()
        }
      : item);
    return record;
  });

  await addAuditLog({
    title: "Certificado vinculado",
    detail: `${company.legalName} | validade ${new Intl.DateTimeFormat("pt-BR").format(new Date(record.validade))}`,
    type: "certificate",
    metadata: { companyId: company.id, certificateId: record.id }
  });

  return {
    message: "Certificado salvo com sucesso.",
    certificate: publicCertificate(record)
  };
}

// Define o formato publico do certificado. Campos secretos como senha
// criptografada nunca devem sair pela API.
function publicCertificate(record) {
  return {
    id: record.id,
    empresaId: record.companyId,
    companyId: record.companyId,
    // Nao exponha filePath/caminhoArquivo para o frontend. Caminho local pode
    // revelar estrutura do servidor e facilitar ataques direcionados.
    titular: record.titular,
    documento: record.documento,
    validade: record.validade,
    tipo: record.tipo,
    status: record.status,
    criadoEm: record.criadoEm
  };
}

// Retorna o certificado ativo da empresa selecionada.
export async function getCurrentCertificate(companyId) {
  const company = await findCompany(companyId);
  const data = await readStore();
  const record = data.certificates.find((item) => item.companyId === company.id);

  if (!record) {
    return null;
  }

  return publicCertificate(record);
}

// Retorna o certificado com dados suficientes para um adaptador fiscal real.
// A senha descriptografada so deve ser usada dentro do backend e nunca enviada
// para telas ou logs. O envio do arquivo ao provedor ainda depende de flag
// explicita no service de integracao.
export async function getCertificateForFiscalProvider(companyId) {
  const company = await findCompany(companyId);
  const data = await readStore();
  const record = data.certificates.find((item) => item.companyId === company.id);

  if (!record) {
    return null;
  }

  return {
    ...publicCertificate(record),
    filePath: record.filePath,
    password: decryptPassword(record.encryptedPassword)
  };
}

// Lista certificados para o painel operacional.
export async function listCertificates() {
  const data = await readStore();
  return data.certificates.map(publicCertificate);
}

// Fluxo auxiliar: cria a empresa usando o CNPJ do certificado e ja vincula o A1.
// Útil quando o usuário começa pelo certificado em vez do cadastro manual.
export async function createCompanyFromCertificate(file, password, payload = {}) {
  const info = validateCertificatePayload(file, password);

  if (!info.documento || info.documento.length !== 14) {
    const error = new Error("O certificado precisa conter CNPJ para cadastrar empresa automaticamente.");
    error.statusCode = 422;
    throw error;
  }

  // Se a empresa ja existir para o CNPJ do certificado, apenas vincula o A1.
  // Se nao existir, cria a empresa com os dados extraidos do certificado.
  const existingCompany = await getCompanyById(info.documento);
  const company = existingCompany || await createCompany({
    legalName: payload.legalName || info.titular,
    cnpj: info.documento,
    certificateLabel: "Certificado validado",
    status: "Certificado pendente"
  });

  const saved = await saveCertificate(company.id, file, password);
  return {
    company,
    certificate: saved.certificate
  };
}
