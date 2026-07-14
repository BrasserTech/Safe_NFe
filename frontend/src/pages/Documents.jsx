import { Download, Eye, FileArchive, FileCode2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Table } from "../components/ui/Table.jsx";
import { api } from "../services/api.js";
import { currency, date } from "../utils/formatters.js";

// Converte resposta binaria da API em download no navegador.
// Usado para XML, PDF e ZIP sem precisar criar arquivos temporarios no frontend.
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function Documents() {
  const [documents, setDocuments] = useState([]);
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState("Todos");
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");

  // Carrega documentos do cofre. Os filtros principais sao aplicados no
  // frontend para manter a tela responsiva em volumes pequenos/medios.
  async function load() {
    const response = await api.get("/documents");
    setDocuments(response.data);
  }

  useEffect(() => {
    load().catch(() => setMessage("Nao foi possivel carregar documentos."));
  }, []);

  const filtered = useMemo(() => documents.filter((document) => {
    const matchesDirection = direction === "Todos" || document.direction === direction;
    const text = [document.type, document.direction, document.company, document.number, document.issuer, document.status].join(" ").toLowerCase();
    return matchesDirection && text.includes(query.toLowerCase());
  }), [documents, direction, query]);

  // Controla a selecao usada pelos downloads em lote.
  function toggle(id) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  // Download individual. A API decide se retorna XML armazenado ou PDF gerado.
  async function download(id, type) {
    const response = await api.get(`/documents/${id}/${type}`, { responseType: "blob" });
    downloadBlob(response.data, `documento-${id}.${type}`);
  }

  // Download em lote via ZIP gerado no backend.
  async function downloadZip(type) {
    const response = await api.post("/documents/download-zip", { documentIds: selected, type }, { responseType: "blob" });
    downloadBlob(response.data, `documentos-${type}.zip`);
  }

  // Abre o PDF gerado em uma nova aba para pre-visualizacao da DANFE.
  async function preview(id) {
    const response = await api.get(`/documents/${id}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Documentos</h2>
        <p className="text-slate-500">Busca, download de XML/PDF, selecao em lote e pre-visualizacao de DANFE.</p>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-soft lg:grid-cols-[1fr_12rem_auto_auto]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por tipo, empresa, numero, emitente ou status" className="rounded-md border border-slate-200 px-3 py-2" />
        <select value={direction} onChange={(event) => setDirection(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2">
          {["Todos", "Entrada", "Saida"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <Button type="button" variant="secondary" disabled={selected.length === 0} onClick={() => downloadZip("xml")}><FileArchive size={16} />XML lote</Button>
        <Button type="button" variant="secondary" disabled={selected.length === 0} onClick={() => downloadZip("pdf")}><FileArchive size={16} />PDF lote</Button>
      </div>

      {message && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">{message}</p>}

      <Table
        columns={[
          { key: "select", label: "", render: (row) => <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} /> },
          { key: "type", label: "Tipo" },
          { key: "direction", label: "Direcao" },
          { key: "number", label: "Numero" },
          { key: "company", label: "Empresa" },
          { key: "date", label: "Data", render: (row) => date(row.date) },
          { key: "amount", label: "Valor", render: (row) => currency(row.amount) },
          { key: "status", label: "Status", render: (row) => <Badge tone={row.status === "Cancelada" ? "red" : "green"}>{row.status}</Badge> },
          { key: "actions", label: "Acoes", render: (row) => (
            <div className="flex gap-2">
              <Button variant="ghost" title="Baixar XML" disabled={!row.hasXml} onClick={() => download(row.id, "xml")}><FileCode2 size={16} /></Button>
              <Button variant="ghost" title="Visualizar DANFE" onClick={() => preview(row.id)}><Eye size={16} /></Button>
              <Button variant="ghost" title="Baixar PDF" onClick={() => download(row.id, "pdf")}><Download size={16} /></Button>
            </div>
          ) }
        ]}
        rows={filtered}
      />
    </div>
  );
}
