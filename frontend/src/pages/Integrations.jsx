import { Cloud, Database, FileText, Link2 } from "lucide-react";
import React from "react";
import { Badge } from "../components/ui/Badge.jsx";
import { Card } from "../components/ui/Card.jsx";

// Esses cards descrevem contratos/capacidades da aplicacao, nao dados de uma
// empresa especifica. Status "Configuravel" exige credencial do provedor.
const integrations = [
  { name: "SEFAZ", detail: "Adaptador HTTP para NF-e, CT-e, NFC-e e MDF-e por Distribuicao DFe.", status: "Configuravel", icon: FileText },
  { name: "NFS-e municipal", detail: "Adaptador HTTP para prefeitura, gateway ou Portal Nacional NFS-e.", status: "Configuravel", icon: Link2 },
  { name: "Contabilidade", detail: "Atendimento por filtros, XML/PDF em lote e auditoria de downloads.", status: "Operacional", icon: Database },
  { name: "Storage local", detail: "XML, metadados e historico gravados em armazenamento local ignorado pelo Git.", status: "Operacional", icon: Cloud }
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
        Para consulta fiscal real, cadastre a empresa, vincule um certificado A1 valido e configure `backend/.env` com `SEFAZ_INTEGRATION_ENABLED=true`, endpoint e token do provedor fiscal contratado.
      </div>
    </div>
  );
}
