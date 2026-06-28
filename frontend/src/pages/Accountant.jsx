import { Download } from "lucide-react";
import React from "react";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Table } from "../components/ui/Table.jsx";
import { mockCompanies } from "../data/mockData.js";

const rows = mockCompanies.map((company, index) => ({
  ...company,
  monthlyFolder: `2026/${String(index + 4).padStart(2, "0")}`,
  closingStatus: index === 1 ? "Pendente" : "Fechado"
}));

export function Accountant() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-navy">Area do Contador</h2>
      <Table
        columns={[
          { key: "legalName", label: "Empresa vinculada" },
          { key: "cnpj", label: "CNPJ" },
          { key: "monthlyFolder", label: "Organizacao por mes" },
          { key: "closingStatus", label: "Status de fechamento", render: (row) => <Badge tone={row.closingStatus === "Fechado" ? "green" : "yellow"}>{row.closingStatus}</Badge> },
          { key: "download", label: "Download em lote", render: () => <Button variant="secondary"><Download size={16} />XML</Button> }
        ]}
        rows={rows}
      />
    </div>
  );
}
