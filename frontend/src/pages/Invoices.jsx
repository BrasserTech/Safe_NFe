import { Eye, FileCode2, FileText, ShieldCheck } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Table } from "../components/ui/Table.jsx";
import { mockInvoices } from "../data/mockData.js";
import { currency, date } from "../utils/formatters.js";

export function Invoices() {
  const [type, setType] = useState("Todos");
  const [status, setStatus] = useState("Todos");

  const rows = useMemo(() => mockInvoices.filter((invoice) => (
    (type === "Todos" || invoice.type === type) && (status === "Todos" || invoice.status === status)
  )), [type, status]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-navy">Notas Fiscais</h2>
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-soft md:grid-cols-4">
        <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2">
          {["Todos", "NF-e", "NFC-e", "NFS-e"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <input type="date" className="rounded-md border border-slate-200 px-3 py-2" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2">
          {["Todos", "Autorizada", "Pendente", "Cancelada"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="rounded-md border border-slate-200 px-3 py-2">
          {["Todas as empresas", "Alfa Comercio", "Delta Alimentos", "Brava Transportes"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <Table
        columns={[
          { key: "number", label: "Numero" },
          { key: "type", label: "Tipo" },
          { key: "issuer", label: "Emitente" },
          { key: "cnpj", label: "CNPJ" },
          { key: "date", label: "Data", render: (row) => date(row.date) },
          { key: "amount", label: "Valor", render: (row) => currency(row.amount) },
          { key: "status", label: "Status", render: (row) => <Badge tone={row.status === "Cancelada" ? "red" : row.status === "Pendente" ? "yellow" : "green"}>{row.status}</Badge> },
          { key: "actions", label: "Acoes", render: () => (
            <div className="flex gap-2">
              <Button variant="ghost" title="Ver XML"><FileCode2 size={16} /></Button>
              <Button variant="ghost" title="Ver DANFE"><Eye size={16} /></Button>
              <Button variant="ghost" title="Manifestar"><ShieldCheck size={16} /></Button>
            </div>
          ) }
        ]}
        rows={rows}
      />
    </div>
  );
}
