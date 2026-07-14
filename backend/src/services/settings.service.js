export function getSettings() {
  return {
    account: {
      owner: "Administrador",
      email: "admin@safe-nfe.local",
      plan: "Local"
    },
    company: {
      name: null,
      cnpj: null
    },
    storage: {
      xmlRetentionYears: 5,
      backupFrequency: "Diario",
      danfeGeneration: true
    },
    futureIntegrations: ["SEFAZ Distribuicao DF-e", "Prefeituras NFS-e", "Certificado A1", "Webhooks"]
  };
}
