import { History } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Card } from "../components/ui/Card.jsx";
import { Table } from "../components/ui/Table.jsx";
import { api } from "../services/api.js";

export function Audit() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get("/audit").then((response) => setLogs(response.data)).catch(() => setLogs([]));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Auditoria</h2>
        <p className="text-slate-500">Historico de capturas, vinculos, manifestacoes e downloads operacionais.</p>
      </div>
      <Card title="Historico de operacoes" icon={History}>
        <Table
          columns={[
            { key: "createdAt", label: "Data", render: (row) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.createdAt)) },
            { key: "type", label: "Tipo" },
            { key: "title", label: "Evento" },
            { key: "detail", label: "Detalhe" }
          ]}
          rows={logs}
        />
      </Card>
    </div>
  );
}
