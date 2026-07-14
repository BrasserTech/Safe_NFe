import { CalendarCheck, FileWarning, PieChart, Sigma } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Card } from "../components/ui/Card.jsx";
import { Table } from "../components/ui/Table.jsx";
import { api } from "../services/api.js";
import { currency } from "../utils/formatters.js";

export function Reports() {
  const [reports, setReports] = useState({
    summary: { totalDocuments: 0, totalAmount: 0, canceled: 0, pendingManifest: 0 },
    byType: {},
    monthly: []
  });

  useEffect(() => {
    api.get("/reports").then((response) => setReports(response.data)).catch(() => {});
  }, []);

  const typeRows = Object.entries(reports.byType).map(([type, total]) => ({ id: type, type, total }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-navy">Relatorios</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Documentos" value={String(reports.summary.totalDocuments)} icon={Sigma} />
        <Card title="Tipos" value={String(Object.keys(reports.byType).length)} icon={PieChart} />
        <Card title="Canceladas" value={String(reports.summary.canceled)} icon={FileWarning} accent="bg-rose-50 text-rose-600" />
        <Card title="Sem manifestacao" value={String(reports.summary.pendingManifest)} icon={CalendarCheck} accent="bg-amber-50 text-amber-600" />
      </div>
      <Table
        columns={[
          { key: "type", label: "Tipo" },
          { key: "total", label: "Documentos" },
          { key: "amount", label: "Valor total", render: () => currency(reports.summary.totalAmount) }
        ]}
        rows={typeRows}
      />
    </div>
  );
}
