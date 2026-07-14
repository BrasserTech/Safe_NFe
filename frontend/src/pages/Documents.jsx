import { Download, Eye, FileArchive, FileCheck2, FileCode2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Table } from "../components/ui/Table.jsx";
import { api } from "../services/api.js";
import { currency, date } from "../utils/formatters.js";

// Converte resposta binaria da API em download no navegador.
// Usado para XML, PDF e ZIP sem precisar criar arquivos temporarios no frontend.
function downloadBlob(blob, filename) {
  // O backend devolve arquivo binario. O navegador so consegue baixar isso se
  // criarmos uma URL temporaria, clicarmos em um link invisivel e depois
  // liberarmos a memoria com revokeObjectURL.
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function Documents() {
  const [searchParams] = useSearchParams();
  // documents vem de GET /documents. Cada item ja foi salvo no cofre pela
  // captura fiscal ou por outro fluxo futuro de importacao.
  const [documents, setDocuments] = useState([]);
  // query/type/direction/manifestFilter controlam os filtros visiveis no topo.
  const [query, setQuery] = useState(searchParams.get("busca") || "");
  const [type, setType] = useState(searchParams.get("tipo") || "Todos");
  const [direction, setDirection] = useState("Todos");
  const [manifestFilter, setManifestFilter] = useState(searchParams.get("manifestacao") === "pendente" ? "Pendente" : "Todos");
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

  // Sincroniza filtros quando a tela e aberta por busca global ou por uma rota
  // legada redirecionada, como /app/ctes ou /app/manifestacao.
  useEffect(() => {
    setQuery(searchParams.get("busca") || "");
    setType(searchParams.get("tipo") || "Todos");
    setManifestFilter(searchParams.get("manifestacao") === "pendente" ? "Pendente" : "Todos");
  }, [searchParams]);

  const filtered = useMemo(() => documents.filter((document) => {
    // Estes filtros nao alteram os dados salvos; eles apenas escondem/mostram
    // linhas da tabela para facilitar conferencia.
    const matchesType = type === "Todos" || document.type === type;
    const matchesDirection = direction === "Todos" || document.direction === direction;
    const matchesManifest = manifestFilter === "Todos" || document.manifestStatus === manifestFilter;
    const text = [
      document.type,
      document.direction,
      document.company,
      document.number,
      document.issuer,
      document.status,
      document.manifestStatus,
      document.source
    ].join(" ").toLowerCase();
    return matchesType && matchesDirection && matchesManifest && text.includes(query.toLowerCase());
  }), [documents, direction, manifestFilter, query, type]);

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

  // Centraliza a manifestacao na propria lista de documentos. Assim a tela
  // antiga de Manifestacao vira apenas um atalho filtrado para pendencias.
  async function manifest(id, manifestStatus) {
    try {
      await api.post(`/invoices/${id}/manifest`, { manifestStatus });
      setMessage("Manifestacao registrada.");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Nao foi possivel manifestar o documento.");
    }
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

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-soft xl:grid-cols-[1fr_10rem_10rem_12rem_auto_auto]">
        {/* Busca livre: procura nos textos ja carregados da tabela, como tipo,
            empresa, numero, emitente, status, manifestacao e fonte. */}
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por tipo, empresa, numero, emitente ou status" className="rounded-md border border-slate-200 px-3 py-2" />
        {/* Tipo de documento: filtra NF-e, CT-e, NFC-e, MDF-e ou NFS-e. */}
        <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2">
          {["Todos", "NF-e", "CT-e", "NFC-e", "MDF-e", "NFS-e"].map((item) => <option key={item}>{item}</option>)}
        </select>
        {/* Entrada/Saida: mostra documentos recebidos ou emitidos pela empresa. */}
        <select value={direction} onChange={(event) => setDirection(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2">
          {["Todos", "Entrada", "Saida"].map((item) => <option key={item}>{item}</option>)}
        </select>
        {/* Manifestacao: ajuda a encontrar notas pendentes de ciencia/confirmacao. */}
        <select value={manifestFilter} onChange={(event) => setManifestFilter(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2">
          {["Todos", "Pendente", "Ciencia da operacao", "Confirmada", "Desconhecida"].map((item) => <option key={item}>{item}</option>)}
        </select>
        {/* XML lote: baixa um ZIP com os XMLs das linhas marcadas no checkbox. */}
        <Button type="button" variant="secondary" disabled={selected.length === 0} onClick={() => downloadZip("xml")}><FileArchive size={16} />XML lote</Button>
        {/* PDF lote: baixa um ZIP com DANFEs/PDFs gerados das linhas marcadas. */}
        <Button type="button" variant="secondary" disabled={selected.length === 0} onClick={() => downloadZip("pdf")}><FileArchive size={16} />PDF lote</Button>
      </div>

      {message && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">{message}</p>}

      <Table
        columns={[
          // Checkbox: marca a linha para entrar nos downloads em lote.
          { key: "select", label: "", render: (row) => <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} /> },
          // Colunas abaixo mostram dados vindos do XML/provedor e salvos no cofre.
          { key: "type", label: "Tipo" },
          { key: "direction", label: "Direcao" },
          { key: "number", label: "Numero" },
          { key: "company", label: "Empresa" },
          { key: "date", label: "Data", render: (row) => date(row.date) },
          { key: "amount", label: "Valor", render: (row) => currency(row.amount) },
          { key: "status", label: "Status", render: (row) => <Badge tone={row.status === "Cancelada" ? "red" : "green"}>{row.status}</Badge> },
          { key: "manifestStatus", label: "Manifestacao", render: (row) => <Badge tone={row.manifestStatus === "Pendente" ? "yellow" : "green"}>{row.manifestStatus || "-"}</Badge> },
          { key: "source", label: "Fonte" },
          { key: "actions", label: "Acoes", render: (row) => (
            <div className="flex gap-2">
              {/* Baixar XML: entrega o arquivo fiscal autorizado salvo no cofre. */}
              <Button variant="ghost" title="Baixar XML" disabled={!row.hasXml} onClick={() => download(row.id, "xml")}><FileCode2 size={16} /></Button>
              {/* Visualizar DANFE: abre em nova aba o PDF detalhado gerado do XML. */}
              <Button variant="ghost" title="Visualizar DANFE" onClick={() => preview(row.id)}><Eye size={16} /></Button>
              {/* Baixar PDF: gera/baixa a DANFE em arquivo PDF. */}
              <Button variant="ghost" title="Baixar PDF" onClick={() => download(row.id, "pdf")}><Download size={16} /></Button>
              {/* Manifestar ciencia: muda o status da NF-e para indicar que a
                  empresa tomou ciencia da operacao. Fica desativado quando nao
                  e NF-e ou quando ja nao esta pendente. */}
              <Button
                variant="ghost"
                title="Manifestar ciencia da operacao"
                disabled={row.type !== "NF-e" || row.manifestStatus !== "Pendente"}
                onClick={() => manifest(row.id, "Ciencia da operacao")}
              >
                <FileCheck2 size={16} />
              </Button>
            </div>
          ) }
        ]}
        rows={filtered}
      />
    </div>
  );
}
