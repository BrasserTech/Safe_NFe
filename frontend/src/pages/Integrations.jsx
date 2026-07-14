import { Cloud, Database, FileText, Link2 } from "lucide-react";
import React from "react";
import { Badge } from "../components/ui/Badge.jsx";
import { Card } from "../components/ui/Card.jsx";

const integrations = [
  { name: "SEFAZ", detail: "NF-e, CT-e, NFC-e e MDF-e por Distribuicao DFe.", status: "Contrato pronto", icon: FileText },
  { name: "NFS-e municipal", detail: "Provider por prefeitura ou Portal Nacional NFS-e.", status: "Configuravel", icon: Link2 },
  { name: "Contabilidade", detail: "Exportacao por competencia e download em lote.", status: "Operacional", icon: Database },
  { name: "Storage S3", detail: "XML/PDF e backup automatico para producao.", status: "Planejado", icon: Cloud }
];

export function Integrations() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Integracoes</h2>
        <p className="text-slate-500">Estado dos contratos fiscais, armazenamento e integrações externas.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {integrations.map(({ name, detail, status, icon }) => (
          <Card key={name} title={name} icon={icon}>
            <p className="text-sm text-slate-600">{detail}</p>
            <div className="mt-4">
              <Badge tone={status === "Planejado" ? "yellow" : "green"}>{status}</Badge>
            </div>
          </Card>
        ))}
      </div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Para consulta fiscal real, configure `backend/.env` com certificado valido, `SEFAZ_INTEGRATION_ENABLED=true` e o adaptador fiscal/endpoint contratado. O modo atual permite testar o fluxo completo de cofre local.
      </div>
    </div>
  );
}
