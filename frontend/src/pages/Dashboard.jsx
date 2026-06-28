import { AlertCircle, Archive, FileInput, FileOutput, FileText, Truck } from "lucide-react";
import React from "react";
import { Badge } from "../components/ui/Badge.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Table } from "../components/ui/Table.jsx";
import { currency } from "../utils/formatters.js";

const bars = [42, 52, 62, 58, 72, 86];
const recent = [
  { id: "1", number: "000.184.991", issuer: "Metalurgica Solaris Ltda", type: "NF-e", amount: 18450.9, status: "Autorizada" },
  { id: "2", number: "000.781.244", issuer: "Rota Azul Logistica", type: "CT-e", amount: 980.2, status: "Autorizado" },
  { id: "3", number: "2026/1568", issuer: "Studio Fiscal Digital", type: "NFS-e", amount: 3200, status: "Pendente" }
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Dashboard</h2>
        <p className="text-slate-500">Visao geral dos documentos fiscais armazenados no cofre.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card title="Total armazenadas" value="18.429" icon={Archive} />
        <Card title="Notas de entrada" value="10.322" icon={FileInput} accent="bg-emerald-50 text-emerald-600" />
        <Card title="Notas de saida" value="8.107" icon={FileOutput} accent="bg-indigo-50 text-indigo-600" />
        <Card title="CT-es" value="1.240" icon={Truck} accent="bg-cyan-50 text-cyan-600" />
        <Card title="Manifestacao pendente" value="36" icon={AlertCircle} accent="bg-amber-50 text-amber-600" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card title="Volume mensal ficticio" icon={FileText}>
          <div className="mt-6 flex h-64 items-end gap-3">
            {bars.map((height, index) => (
              <div key={height} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-md bg-ocean" style={{ height: `${height}%` }} />
                <span className="text-xs font-semibold text-slate-500">{["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"][index]}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Saude fiscal">
          <div className="space-y-4">
            {["Backup diario ativo", "Certificado A1 valido", "Fechamento de junho em revisao"].map((item, index) => (
              <div key={item} className="flex items-center justify-between rounded-md bg-slate-50 p-4">
                <span className="font-semibold text-slate-700">{item}</span>
                <Badge tone={index === 2 ? "yellow" : "green"}>{index === 2 ? "Atencao" : "OK"}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Table
        columns={[
          { key: "number", label: "Numero" },
          { key: "issuer", label: "Emitente" },
          { key: "type", label: "Tipo" },
          { key: "amount", label: "Valor", render: (row) => currency(row.amount) },
          { key: "status", label: "Status", render: (row) => <Badge tone={row.status === "Pendente" ? "yellow" : "green"}>{row.status}</Badge> }
        ]}
        rows={recent}
      />
    </div>
  );
}
