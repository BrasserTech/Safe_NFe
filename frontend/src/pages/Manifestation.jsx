import React, { useState } from "react";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { mockInvoices } from "../data/mockData.js";
import { currency } from "../utils/formatters.js";

const actions = ["Ciencia da Operacao", "Confirmacao da Operacao", "Desconhecimento da Operacao", "Operacao nao Realizada"];

export function Manifestation() {
  const [rows, setRows] = useState(mockInvoices.filter((invoice) => invoice.manifestStatus === "Pendente"));

  function updateStatus(id, status) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, manifestStatus: status } : row));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-navy">Manifestacao do Destinatario</h2>
      <div className="grid gap-4">
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
