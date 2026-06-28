export function getSettings() {
  return {
    account: {
      owner: "Paulo Fiscal",
      email: "paulo@fiscalvault.local",
      plan: "Profissional"
    },
    company: {
      name: "Alfa Comercio de Equipamentos Ltda",
      cnpj: "12.345.678/0001-90"
    },
    storage: {
      xmlRetentionYears: 5,
      backupFrequency: "Diario",
      danfeGeneration: true
    },
    futureIntegrations: ["SEFAZ Distribuicao DF-e", "Prefeituras NFS-e", "Certificado A1", "Webhooks"]
  };
}
