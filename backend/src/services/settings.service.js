import { prisma } from "../config/prisma.js";

export function getSettings() {
  // Retorna apenas configuracoes tecnicas reais do ambiente local.
  // Dados de conta/empresa devem vir de Auth e Empresas, nunca de placeholders.
  return {
    account: {
      owner: null,
      email: null,
      plan: "Local"
    },
    company: {
      name: null,
      cnpj: null
    },
    storage: {
      xmlRetentionYears: 5,
      backupFrequency: null,
      danfeGeneration: true,
      mode: "local-json"
    },
    enabledModules: ["Empresas", "Certificado A1", "Captura", "Documentos", "Auditoria"]
  };
}

export async function testDatabaseConnection() {
  const startedAt = Date.now();
  const [database] = await prisma.$queryRaw`
    SELECT
      current_database() AS nome,
      current_schema() AS schema,
      to_regclass('public.app_config') IS NOT NULL AS estrutura_criada
  `;

  return {
    connected: true,
    message: "Conexao com o banco de dados realizada com sucesso.",
    database: database.nome,
    schema: database.schema,
    structureReady: database.estrutura_criada,
    responseTimeMs: Date.now() - startedAt,
    testedAt: new Date().toISOString()
  };
}
