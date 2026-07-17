import { CheckCircle2, Database, LoaderCircle, XCircle } from "lucide-react";
import React, { useState } from "react";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { api } from "../services/api.js";

export function Settings() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  async function testDatabaseConnection() {
    setTesting(true);
    setResult(null);

    try {
      const response = await api.get("/settings/database/test");
      setResult(response.data);
    } catch (error) {
      setResult({
        connected: false,
        message: error.response?.data?.message || "Nao foi possivel testar a conexao com o banco de dados.",
        error: error.response?.data?.error
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Configuracoes</h2>
        <p className="text-slate-500">Verifique os servicos essenciais usados pelo Safe NFe.</p>
      </div>

      <div className="max-w-2xl">
        <Card title="Conexao com o banco de dados" icon={Database}>
          <p className="text-sm text-slate-600">
            Testa se o backend consegue acessar o PostgreSQL configurado, sem mostrar usuario ou senha no navegador.
          </p>

          <Button
            type="button"
            className="mt-4"
            disabled={testing}
            onClick={testDatabaseConnection}
          >
            {testing ? <LoaderCircle className="animate-spin" size={18} /> : <Database size={18} />}
            {testing ? "Testando conexao..." : "Testar conexao"}
          </Button>

          {result && (
            <div
              className={`mt-4 rounded-md border p-4 ${
                result.connected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              <div className="flex items-start gap-3">
                {result.connected ? <CheckCircle2 className="mt-0.5 shrink-0" size={20} /> : <XCircle className="mt-0.5 shrink-0" size={20} />}
                <div>
                  <p className="text-sm font-bold">{result.message}</p>
                  {result.connected && (
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                      <dt className="font-semibold">Banco:</dt>
                      <dd>{result.database}</dd>
                      <dt className="font-semibold">Schema:</dt>
                      <dd>{result.schema}</dd>
                      <dt className="font-semibold">Estrutura:</dt>
                      <dd>{result.structureReady ? "app_config encontrada" : "app_config nao encontrada"}</dd>
                      <dt className="font-semibold">Resposta:</dt>
                      <dd>{result.responseTimeMs} ms</dd>
                    </dl>
                  )}
                  {!result.connected && result.error && <p className="mt-1 text-xs">Codigo: {result.error}</p>}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
