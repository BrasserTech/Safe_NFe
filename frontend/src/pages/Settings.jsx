import { FileKey2, Link2 } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";

export function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Configuracoes</h2>
        <p className="text-slate-500">Ajustes operacionais sem dados pre-carregados.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Certificados digitais" icon={FileKey2}>
          <p className="text-sm text-slate-600">
            Cadastre uma empresa real e vincule o certificado A1 pela aba Certificado A1 em Empresas.
          </p>
          <Link className="mt-4 inline-flex" to="/app/empresas">
            <Button type="button">Abrir empresas</Button>
          </Link>
        </Card>

        <Card title="Integracoes fiscais" icon={Link2}>
          <p className="text-sm text-slate-600">
            Configure endpoints e flags no arquivo `backend/.env` antes de habilitar consulta fiscal real.
          </p>
          <Link className="mt-4 inline-flex" to="/app/integracoes">
            <Button type="button" variant="secondary">Ver integracoes</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
