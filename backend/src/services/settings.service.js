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
