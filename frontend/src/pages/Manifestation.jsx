import React, { useEffect, useState } from "react";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { api } from "../services/api.js";
import { currency } from "../utils/formatters.js";

const actions = ["Ciencia da Operacao", "Confirmacao da Operacao", "Desconhecimento da Operacao", "Operacao nao Realizada"];

export function Manifestation() {
  const [rows, setRows] = useState([]);

  async function load() {
    const response = await api.get("/documents");
    setRows(response.data.filter((invoice) => invoice.manifestStatus === "Pendente"));
  }

  useEffect(() => {
    load().catch(() => setRows([]));
  }, []);

  async function updateStatus(id, status) {
    await api.post(`/invoices/${id}/manifest`, { manifestStatus: status });
    await load();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-navy">Manifestacao do Destinatario</h2>
      <div className="grid gap-4">
        {rows.length === 0 && (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
            Nenhum documento pendente de manifestacao.
          </section>
        )}
        {rows.map((invoice) => (
          <section key={invoice.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <strong className="text-navy">{invoice.number}</strong>
                  <Badge tone={invoice.manifestStatus === "Pendente" ? "yellow" : "green"}>{invoice.manifestStatus}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">{invoice.issuer} - {invoice.cnpj} - {currency(invoice.amount)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <Button key={action} variant={action.includes("Desconhecimento") ? "danger" : "secondary"} onClick={() => updateStatus(invoice.id, action)}>
                    {action}
                  </Button>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
