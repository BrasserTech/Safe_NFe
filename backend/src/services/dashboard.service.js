import { readStore } from "./store.service.js";

export async function getDashboard() {
  const data = await readStore();
  const documents = data.documents;
  const inbound = documents.filter((item) => item.direction === "Entrada").length;
  const outbound = documents.filter((item) => item.direction === "Saida").length;
  const ctes = documents.filter((item) => item.type === "CT-e").length;
  const pendingManifest = documents.filter((item) => item.manifestStatus === "Pendente").length;
  const monthly = new Map();

  for (const document of documents) {
    const date = new Date(document.date || document.createdAt);
    const key = Number.isNaN(date.getTime())
      ? "Sem data"
      : new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "");
    const current = monthly.get(key) || { month: key, documents: 0, total: 0 };
    current.documents += 1;
    current.total += Number(document.amount || 0);
    monthly.set(key, current);
  }

  return {
    totals: {
      stored: documents.length,
      inbound,
      outbound,
      ctes,
      pendingManifest
    },
    monthlyVolume: Array.from(monthly.values()),
    recentInvoices: documents.slice(0, 5)
  };
}
