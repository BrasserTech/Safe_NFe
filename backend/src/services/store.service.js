import path from "path";
import { createHash } from "crypto";
import { prisma } from "../config/prisma.js";

const dataRoot = path.resolve(process.cwd(), "storage");

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function companyStatus(value) {
  const status = String(value || "").toLowerCase();
  if (status.includes("ativa") && !status.includes("inativa")) return "ativa";
  if (status.includes("vencido")) return "certificado_vencido";
  if (status.includes("erro")) return "erro";
  if (status.includes("inativa")) return "inativa";
  return "pendente_certificado";
}

function documentType(value) {
  return String(value || "NFE").replace(/-/g, "").toUpperCase();
}

function documentDirection(value) {
  const direction = String(value || "entrada").toLowerCase();
  return ["entrada", "saida", "terceiro"].includes(direction) ? direction : "entrada";
}

function documentStatus(value) {
  const status = String(value || "").toLowerCase();
  const map = { autorizada: "autorizado", autorizado: "autorizado", cancelada: "cancelado", cancelado: "cancelado", denegada: "denegado", denegado: "denegado" };
  return map[status] || "pendente";
}

function manifestationStatus(value) {
  const status = String(value || "").toLowerCase();
  if (status.includes("ciencia")) return "ciencia";
  if (status.includes("confirm")) return "confirmada";
  if (status.includes("desconhec")) return "desconhecida";
  if (status.includes("nao")) return "nao_realizada";
  return "pendente";
}

export async function readStore() {
  const [users, companies, certificates, documents, auditLogs, config] = await Promise.all([
    prisma.$queryRaw`SELECT identificador::text AS id, nome, email, login, senha, perfil_global, datahoracad, datahoraalt FROM usuarios WHERE ativo = TRUE ORDER BY chave`,
    prisma.$queryRaw`SELECT identificador::text AS id, razao_social, nome_fantasia, cpf_cnpj, status_fiscal, datahoracad, datahoraalt FROM empresas WHERE ativo = TRUE ORDER BY chave DESC`,
    prisma.$queryRaw`SELECT c.identificador::text AS id, e.identificador::text AS empresa_id, c.storage_chave, c.senha_criptografada, c.titular, c.cpf_cnpj, c.valido_ate, c.tipo, c.status, c.datahoracad FROM certificados_digitais c JOIN empresas e ON e.chave = c.empresa_chave WHERE c.ativo = TRUE ORDER BY c.chave DESC`,
    prisma.$queryRaw`
      SELECT d.identificador::text AS id, e.identificador::text AS empresa_id, e.razao_social AS empresa,
             d.numero, d.tipo_documento, d.direcao, d.data_emissao, d.valor_total, d.status,
             d.manifestacao_status, d.chave_acesso, d.origem_captura, d.nsu, d.datahoracad, d.datahoraalt,
             emit.nome_razao_social AS emitente, emit.cpf_cnpj AS emitente_documento,
             arquivo.conteudo AS xml
      FROM documentos_fiscais d
      JOIN empresas e ON e.chave = d.empresa_chave
      LEFT JOIN LATERAL (
        SELECT p.nome_razao_social, p.cpf_cnpj
        FROM documentos_participantes dp
        JOIN participantes_fiscais p ON p.chave = dp.participante_chave
        WHERE dp.documento_fiscal_chave = d.chave AND dp.papel = 'emitente' AND dp.ativo = TRUE
        ORDER BY dp.ordem LIMIT 1
      ) emit ON TRUE
      LEFT JOIN LATERAL (
        SELECT da.conteudo
        FROM documentos_arquivos da
        WHERE da.documento_fiscal_chave = d.chave AND da.tipo = 'xml' AND da.ativo = TRUE
        ORDER BY da.versao DESC LIMIT 1
      ) arquivo ON TRUE
      WHERE d.ativo = TRUE ORDER BY d.data_emissao DESC NULLS LAST, d.chave DESC
    `,
    prisma.$queryRaw`SELECT identificador::text AS id, entidade AS tipo, acao AS titulo, descricao AS detalhe, metadados, dataevento FROM auditoria WHERE ativo = TRUE ORDER BY dataevento DESC`,
    prisma.$queryRaw`SELECT parametros FROM app_config WHERE ativo = TRUE ORDER BY chave LIMIT 1`
  ]);

  return {
    users: users.map((row) => ({ id: row.id, name: row.nome, email: row.email, username: row.login, passwordHash: row.senha, role: row.perfil_global.toUpperCase(), createdAt: iso(row.datahoracad), updatedAt: iso(row.datahoraalt) })),
    companies: companies.map((row) => ({ id: row.id, legalName: row.razao_social, tradeName: row.nome_fantasia || "", cnpj: row.cpf_cnpj, status: row.status_fiscal, createdAt: iso(row.datahoracad), updatedAt: iso(row.datahoraalt) })),
    certificates: certificates.map((row) => ({ id: row.id, companyId: row.empresa_id, filePath: row.storage_chave, encryptedPassword: row.senha_criptografada, titular: row.titular, documento: row.cpf_cnpj, validade: iso(row.valido_ate), tipo: row.tipo, status: row.status, criadoEm: iso(row.datahoracad) })),
    documents: documents.map((row) => ({ id: row.id, companyId: row.empresa_id, company: row.empresa, number: row.numero, type: row.tipo_documento === "NFE" ? "NF-e" : row.tipo_documento === "NFSE" ? "NFS-e" : row.tipo_documento === "CTE" ? "CT-e" : row.tipo_documento, direction: row.direcao === "saida" ? "Saida" : "Entrada", issuer: row.emitente || "", cnpj: row.emitente_documento || "", date: row.data_emissao ? new Date(row.data_emissao).toISOString().slice(0, 10) : "", amount: Number(row.valor_total || 0), status: row.status, manifestStatus: row.manifestacao_status, accessKey: row.chave_acesso || "", source: row.origem_captura, nsu: row.nsu || "", xml: row.xml ? Buffer.from(row.xml).toString("utf8") : "", pdfAvailable: Boolean(row.xml), createdAt: iso(row.datahoracad), updatedAt: iso(row.datahoraalt) })),
    auditLogs: auditLogs.map((row) => ({ id: row.id, type: row.tipo, title: row.titulo, detail: row.detalhe || "", metadata: row.metadados || {}, createdAt: iso(row.dataevento) })),
    settings: config[0]?.parametros || { storageMode: "banco" }
  };
}

async function syncUsers(tx, users) {
  for (const user of users) {
    await tx.$executeRaw`
      INSERT INTO usuarios (identificador, chavecliente, chavecidade, nome, email, login, senha, perfil_global)
      SELECT ${user.id}::uuid, c.chave, c.chavecidade, ${user.name}, ${user.email}, ${user.username}, ${user.passwordHash}, ${String(user.role || "usuario").toLowerCase()}
      FROM clientes c WHERE c.ativo = TRUE ORDER BY c.chave LIMIT 1
      ON CONFLICT (identificador) DO UPDATE SET nome = EXCLUDED.nome, email = EXCLUDED.email,
        login = EXCLUDED.login, senha = EXCLUDED.senha, perfil_global = EXCLUDED.perfil_global,
        ativo = TRUE, datahoraalt = CURRENT_TIMESTAMP
    `;
  }
}

async function syncCompanies(tx, companies) {
  const ids = companies.map((item) => item.id);
  await tx.$executeRaw`UPDATE empresas SET ativo = FALSE, datahoraalt = CURRENT_TIMESTAMP WHERE ativo = TRUE AND NOT (identificador::text = ANY(${ids}::text[]))`;
  for (const company of companies) {
    await tx.$executeRaw`
      INSERT INTO empresas (identificador, cliente_chave, cpf_cnpj, razao_social, nome_fantasia, status_fiscal)
      SELECT ${company.id}::uuid, c.chave, ${company.cnpj}, ${company.legalName}, ${company.tradeName || null}, ${companyStatus(company.status)}
      FROM clientes c WHERE c.ativo = TRUE ORDER BY c.chave LIMIT 1
      ON CONFLICT (identificador) DO UPDATE SET cpf_cnpj = EXCLUDED.cpf_cnpj,
        razao_social = EXCLUDED.razao_social, nome_fantasia = EXCLUDED.nome_fantasia,
        status_fiscal = EXCLUDED.status_fiscal, ativo = TRUE, datahoraalt = CURRENT_TIMESTAMP
    `;
  }
}

async function syncCertificates(tx, certificates) {
  const ids = certificates.map((item) => item.id);
  await tx.$executeRaw`UPDATE certificados_digitais SET ativo = FALSE, datahoraalt = CURRENT_TIMESTAMP WHERE ativo = TRUE AND NOT (identificador::text = ANY(${ids}::text[]))`;
  for (const certificate of certificates) {
    await tx.$executeRaw`
      INSERT INTO certificados_digitais (identificador, empresa_chave, tipo, titular, cpf_cnpj, valido_ate, storage_chave, senha_criptografada, status)
      SELECT ${certificate.id}::uuid, e.chave, ${certificate.tipo || "A1"}, ${certificate.titular}, ${certificate.documento}, ${certificate.validade}::timestamptz, ${certificate.filePath}, ${certificate.encryptedPassword}, ${certificate.status}
      FROM empresas e WHERE e.identificador = ${certificate.companyId}::uuid
      ON CONFLICT (identificador) DO UPDATE SET valido_ate = EXCLUDED.valido_ate,
        storage_chave = EXCLUDED.storage_chave, senha_criptografada = EXCLUDED.senha_criptografada,
        status = EXCLUDED.status, ativo = TRUE, datahoraalt = CURRENT_TIMESTAMP
    `;
  }
}

async function syncDocuments(tx, documents) {
  const ids = documents.map((item) => item.id);
  await tx.$executeRaw`UPDATE documentos_fiscais SET ativo = FALSE, datahoraalt = CURRENT_TIMESTAMP WHERE ativo = TRUE AND NOT (identificador::text = ANY(${ids}::text[]))`;
  for (const document of documents) {
    await tx.$executeRaw`
      INSERT INTO documentos_fiscais (identificador, empresa_chave, tipo_documento, numero, chave_acesso, nsu, direcao, data_emissao, status, manifestacao_status, valor_total, origem_captura)
      SELECT ${document.id}::uuid, e.chave, ${documentType(document.type)}, ${document.number}, ${document.accessKey || null}, ${document.nsu || null}, ${documentDirection(document.direction)}, ${document.date || null}::timestamptz, ${documentStatus(document.status)}, ${manifestationStatus(document.manifestStatus)}, ${Number(document.amount || 0)}, ${String(document.source || "api").toLowerCase().includes("sefaz") ? "sefaz" : "api"}
      FROM empresas e WHERE e.identificador = ${document.companyId}::uuid
      ON CONFLICT (identificador) DO UPDATE SET numero = EXCLUDED.numero, chave_acesso = EXCLUDED.chave_acesso,
        nsu = EXCLUDED.nsu, status = EXCLUDED.status, manifestacao_status = EXCLUDED.manifestacao_status,
        valor_total = EXCLUDED.valor_total, ativo = TRUE, datahoraalt = CURRENT_TIMESTAMP
    `;
    if (document.xml) {
      const xmlHash = createHash("sha256").update(document.xml).digest("hex");
      await tx.$executeRaw`
        INSERT INTO documentos_arquivos (documento_fiscal_chave, tipo, original, nome_arquivo, mime_type, encoding, tamanho_original_bytes, tamanho_armazenado_bytes, hash_sha256, conteudo)
        SELECT d.chave, 'xml', TRUE, ${`${document.accessKey || document.id}.xml`}, 'application/xml', 'UTF-8', ${Buffer.byteLength(document.xml)}, ${Buffer.byteLength(document.xml)}, ${xmlHash}, convert_to(${document.xml}, 'UTF8')
        FROM documentos_fiscais d WHERE d.identificador = ${document.id}::uuid
        ON CONFLICT (documento_fiscal_chave, tipo, versao) DO UPDATE SET conteudo = EXCLUDED.conteudo,
          tamanho_original_bytes = EXCLUDED.tamanho_original_bytes, tamanho_armazenado_bytes = EXCLUDED.tamanho_armazenado_bytes,
          hash_sha256 = EXCLUDED.hash_sha256, ativo = TRUE, datahoraalt = CURRENT_TIMESTAMP
      `;
    }
  }
}

async function syncAudit(tx, auditLogs) {
  for (const log of auditLogs) {
    await tx.$executeRaw`
      INSERT INTO auditoria (identificador, entidade, acao, descricao, metadados, dataevento)
      VALUES (${log.id}::uuid, ${log.type || "operation"}, ${log.title}, ${log.detail || null}, ${JSON.stringify(log.metadata || {})}::jsonb, ${log.createdAt || new Date().toISOString()}::timestamptz)
      ON CONFLICT (identificador) DO NOTHING
    `;
  }
}

export async function writeStore(data) {
  await prisma.$transaction(async (tx) => {
    await syncUsers(tx, data.users || []);
    await syncCompanies(tx, data.companies || []);
    await syncCertificates(tx, data.certificates || []);
    await syncDocuments(tx, data.documents || []);
    await syncAudit(tx, data.auditLogs || []);
  });
  return data;
}

export async function updateStore(mutator) {
  const data = await readStore();
  const result = await mutator(data);
  await writeStore(data);
  return result;
}

export { dataRoot };
