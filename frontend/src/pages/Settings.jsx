import React from "react";
import { Card } from "../components/ui/Card.jsx";

const sections = [
  ["Dados da conta", ["Responsavel: Paulo Fiscal", "E-mail: paulo@fiscalvault.local", "Plano: Profissional"]],
  ["Dados da empresa", ["Alfa Comercio de Equipamentos Ltda", "CNPJ 12.345.678/0001-90", "Ambiente mockado"]],
  ["Certificado digital", ["A1 valido ate 12/2026", "Renovacao monitorada", "Upload futuro preparado"]],
  ["Preferencias de armazenamento", ["Backup diario", "Retencao de XML por 5 anos", "DANFE gerado sob demanda"]],
  ["Integracoes futuras", ["SEFAZ Distribuicao DF-e", "Prefeituras NFS-e", "Webhooks e ERPs"]]
];

export function Settings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-navy">Configuracoes</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(([title, items]) => (
          <Card key={title} title={title}>
            <ul className="space-y-2 text-sm text-slate-600">
              {items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
