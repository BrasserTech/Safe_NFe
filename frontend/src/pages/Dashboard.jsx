import { AlertCircle, Archive, Building2, FileInput, FileOutput, FileSearch, FileText, Link2, Truck } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Table } from "../components/ui/Table.jsx";
import { currency } from "../utils/formatters.js";

import { api } from "../services/api.js";

export function Dashboard() {
  const [dashboard, setDashboard] = useState({
    totals: { stored: 0, inbound: 0, outbound: 0, ctes: 0, pendingManifest: 0 },
    monthlyVolume: [],
    recentInvoices: []
  });

  useEffect(() => {
    api.get("/dashboard").then((response) => setDashboard(response.data)).catch(() => {});
  }, []);

  const bars = dashboard.monthlyVolume.length ? dashboard.monthlyVolume : [{ month: "Atual", documents: 1 }];
  const max = Math.max(...bars.map((item) => item.documents), 1);
  const modules = [
    { title: "Empresas", text: "Cadastro e certificado A1 no mesmo fluxo.", to: "/app/empresas", icon: Building2 },
    { title: "Captura", text: "Busca por SEFAZ, NFS-e, NSU, chave e periodo.", to: "/app/captura", icon: FileSearch },
    { title: "Documentos", text: "XML, PDF, DANFE, CT-e e manifestacao.", to: "/app/documentos", icon: FileText },
    { title: "Integracoes", text: "Contratos fiscais, contador e armazenamento.", to: "/app/integracoes", icon: Link2 }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Dashboard</h2>
        <p className="text-slate-500">Visao geral dos documentos fiscais armazenados no cofre.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card title="Total armazenadas" value={String(dashboard.totals.stored)} icon={Archive} />
        <Card title="Notas de entrada" value={String(dashboard.totals.inbound)} icon={FileInput} accent="bg-emerald-50 text-emerald-600" />
        <Card title="Notas de saida" value={String(dashboard.totals.outbound)} icon={FileOutput} accent="bg-indigo-50 text-indigo-600" />
        <Card title="CT-es" value={String(dashboard.totals.ctes)} icon={Truck} accent="bg-cyan-50 text-cyan-600" />
        <Card title="Manifestacao pendente" value={String(dashboard.totals.pendingManifest)} icon={AlertCircle} accent="bg-amber-50 text-amber-600" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card title="Volume mensal" icon={FileText}>
          <div className="mt-6 flex h-64 items-end gap-3">
            {bars.map((item) => (
              <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-md bg-ocean" style={{ height: `${Math.max((item.documents / max) * 100, 8)}%` }} />
                <span className="text-xs font-semibold text-slate-500">{item.month}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Modulos operacionais">
          <div className="space-y-3">
            {modules.map(({ title, text, to, icon: Icon }) => (
              <Link key={title} to={to} className="flex items-center gap-3 rounded-md border border-slate-200 p-3 transition hover:border-ocean hover:bg-slate-50">
                <span className="grid h-10 w-10 place-items-center rounded-md bg-ocean/10 text-ocean">
                  <Icon size={18} />
                </span>
                <span>
                  <strong className="block text-sm text-navy">{title}</strong>
                  <span className="text-xs text-slate-500">{text}</span>
                </span>
              </Link>
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
        rows={dashboard.recentInvoices}
      />
    </div>
  );
}
