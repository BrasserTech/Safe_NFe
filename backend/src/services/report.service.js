import { readStore } from "./store.service.js";

// Relatorios derivados dos documentos reais armazenados.
// Sem documentos cadastrados/capturados, todos os totais retornam zerados.
export async function getReports() {
  const data = await readStore();
  const documents = data.documents;
  const byType = documents.reduce((acc, document) => {
    acc[document.type] = (acc[document.type] || 0) + 1;
    return acc;
  }, {});

  return {
    summary: {
      totalDocuments: documents.length,
      totalAmount: documents.reduce((sum, document) => sum + Number(document.amount || 0), 0),
      canceled: documents.filter((document) => document.status === "Cancelada").length,
      pendingManifest: documents.filter((document) => document.manifestStatus === "Pendente").length
    },
    byType,
    monthly: []
  };
}
