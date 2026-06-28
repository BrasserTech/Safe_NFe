import { Plus } from "lucide-react";
import React, { useState } from "react";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Table } from "../components/ui/Table.jsx";
import { mockCompanies } from "../data/mockData.js";

export function Companies() {
  const [companies, setCompanies] = useState(mockCompanies);

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setCompanies((current) => [...current, {
      id: `cmp-${Date.now()}`,
      legalName: form.get("legalName"),
      cnpj: form.get("cnpj"),
      certificateLabel: form.get("certificateLabel"),
      status: form.get("status")
    }]);
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-navy">Empresas</h2>
      <form onSubmit={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-soft md:grid-cols-5">
        <input name="legalName" required placeholder="Razao social" className="rounded-md border border-slate-200 px-3 py-2 md:col-span-2" />
        <input name="cnpj" required placeholder="CNPJ" className="rounded-md border border-slate-200 px-3 py-2" />
        <input name="certificateLabel" required placeholder="Certificado digital" className="rounded-md border border-slate-200 px-3 py-2" />
        <select name="status" className="rounded-md border border-slate-200 px-3 py-2">
          <option>Ativa</option>
          <option>Certificado pendente</option>
          <option>Inativa</option>
        </select>
        <Button className="md:col-span-5"><Plus size={16} />Adicionar empresa</Button>
      </form>
      <Table
        columns={[
          { key: "legalName", label: "Razao social" },
          { key: "cnpj", label: "CNPJ" },
          { key: "certificateLabel", label: "Certificado digital" },
          { key: "status", label: "Status", render: (row) => <Badge tone={row.status === "Ativa" ? "green" : "yellow"}>{row.status}</Badge> }
        ]}
        rows={companies}
      />
    </div>
  );
}
