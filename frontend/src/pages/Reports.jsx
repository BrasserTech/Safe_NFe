import { CalendarCheck, FileWarning, PieChart, Sigma } from "lucide-react";
import React from "react";
import { Card } from "../components/ui/Card.jsx";
import { Table } from "../components/ui/Table.jsx";
import { currency } from "../utils/formatters.js";

const monthly = [
  { id: "1", month: "Abril/2026", documents: 1290, amount: 1840500.9, status: "Fechado" },
  { id: "2", month: "Maio/2026", documents: 1510, amount: 2051800.2, status: "Fechado" },
  { id: "3", month: "Junho/2026", documents: 1725, amount: 2364900.45, status: "Em revisao" }
];

export function Reports() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-navy">Relatorios</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Total por mes" value="1.725" icon={Sigma} />
        <Card title="Por tipo" value="4 grupos" icon={PieChart} />
        <Card title="Canceladas" value="42" icon={FileWarning} accent="bg-rose-50 text-rose-600" />
        <Card title="Sem manifestacao" value="36" icon={CalendarCheck} accent="bg-amber-50 text-amber-600" />
      </div>
      <Table
        columns={[
          { key: "month", label: "Fechamento mensal" },
          { key: "documents", label: "Documentos" },
          { key: "amount", label: "Valor total", render: (row) => currency(row.amount) },
          { key: "status", label: "Status" }
        ]}
        rows={monthly}
      />
    </div>
  );
}
