import { CheckCircle2, Loader2, SearchCheck } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { api } from "../services/api.js";

export function Capture() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  // Cada campo abaixo corresponde a um controle visivel na tela Captura.
  // Quando o usuario clica em "Buscar NFs", esse objeto inteiro vai para
  // o backend e vira o payload da consulta fiscal.
  const [form, setForm] = useState({
    companyId: "",
    documentType: "Todos",
    source: "SEFAZ Distribuicao DFe",
    environment: "Producao",
    direction: "Entrada",
    role: "Destinatario",
    ufCode: "42",
    queryMode: "distNSU",
    dateFrom: new Date().toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    nsu: "",
    accessKey: "",
    includeXml: true,
    includePdf: true,
    manifest: false
  });

  // A captura sempre parte de uma empresa cadastrada. O certificado e validado
  // pelo backend antes de qualquer documento ser salvo.
  useEffect(() => {
    api.get("/companies").then((response) => {
      setCompanies(response.data);
      setForm((current) => ({ ...current, companyId: current.companyId || response.data[0]?.id || "" }));
    }).catch(() => setMessage("Cadastre uma empresa antes de capturar documentos."));
  }, []);

  // Atualiza campos do formulario sem espalhar varios useState independentes.
  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  // Envia a consulta para a fonte correta. Em modo local, o backend salva um
  // documento de teste; com adaptador fiscal real, este contrato permanece.
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // A fonte escolhida pelo usuario decide qual rota da API sera chamada.
      // SEFAZ/Prefeitura usam a rota geral de distribuicao; Portal Nacional
      // NFS-e usa a rota especifica de NFS-e.
      const endpoint = form.source === "Portal Nacional NFS-e" ? "/capture/nfse-national" : "/capture/sefaz-distribution";
      const response = await api.post(endpoint, form);
      setMessage(`${response.data.saved_documents?.length || 0} documento(s) salvo(s). ${response.data.reason || ""}`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Nao foi possivel executar a captura.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Captura fiscal</h2>
        <p className="text-slate-500">Consulta parametrizada por certificado, fonte fiscal, NSU, chave, periodo e papel da empresa.</p>
      </div>

      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card title="Buscar NFs" icon={SearchCheck}>
          <div className="grid gap-3 md:grid-cols-2">
            {/* Empresa: vem de GET /companies. E o cadastro que recebera os
                documentos capturados e o certificado A1 usado na consulta. */}
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Empresa
              <select value={form.companyId} onChange={(event) => change("companyId", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 font-normal">
                {companies.map((company) => <option key={company.id} value={company.id}>{company.legalName} - {company.cnpj}</option>)}
              </select>
            </label>
            {/* Documento: filtra o tipo fiscal desejado. "Todos" deixa o
                backend/provedor decidir quais modelos retornar. */}
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Documento
              <select value={form.documentType} onChange={(event) => change("documentType", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 font-normal">
                {["Todos", "NF-e", "CT-e", "NFC-e", "MDF-e", "NFS-e"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            {/* Fonte: define se a busca vai para SEFAZ, Portal Nacional NFS-e
                ou provedor municipal configurado no backend. */}
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Fonte
              <select value={form.source} onChange={(event) => change("source", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 font-normal">
                {["SEFAZ Distribuicao DFe", "Portal Nacional NFS-e", "Prefeitura NFS-e"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            {/* Ambiente: Producao consulta documentos reais; Homologacao deve
                ser usado apenas quando o provedor oferecer ambiente de teste. */}
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Ambiente
              <select value={form.environment} onChange={(event) => change("environment", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 font-normal">
                {["Producao", "Homologacao"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            {/* Entrada/Saida: informa se a empresa esta buscando documentos
                recebidos ou emitidos. Esse dado tambem aparece na tabela. */}
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Entrada ou saida
              <select value={form.direction} onChange={(event) => change("direction", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 font-normal">
                {["Entrada", "Saida"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            {/* Papel da empresa: ajuda o provedor a saber se o CNPJ deve ser
                tratado como destinatario, emitente, transportador etc. */}
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Papel da empresa
              <select value={form.role} onChange={(event) => change("role", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 font-normal">
                {["Destinatario", "Emitente", "Transportador", "Tomador de servico", "Prestador de servico"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            {/* UF autorizadora: codigo IBGE da SEFAZ estadual usada na consulta. */}
            <label className="grid gap-1 text-sm font-semibold text-slate-700">UF autorizadora
              <select value={form.ufCode} onChange={(event) => change("ufCode", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 font-normal">
                {["42-SC", "35-SP", "33-RJ", "31-MG", "41-PR", "43-RS", "53-DF", "29-BA", "23-CE", "26-PE"].map((item) => <option key={item} value={item.split("-")[0]}>{item}</option>)}
              </select>
            </label>
            {/* Consulta SEFAZ: distNSU busca em lote a partir do ultimo NSU;
                consNSU busca um NSU especifico; consChNFe busca pela chave. */}
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Consulta SEFAZ
              <select value={form.queryMode} onChange={(event) => change("queryMode", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 font-normal">
                <option value="distNSU">Distribuir usando ultimo NSU salvo</option>
                <option value="consNSU">Consultar NSU especifico</option>
                <option value="consChNFe">Consultar por chave NF-e</option>
              </select>
            </label>
            {/* Periodo da consulta. Esses valores seguem para o provedor no
                payload dateFrom/dateTo. */}
            <input type="date" value={form.dateFrom} onChange={(event) => change("dateFrom", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2" />
            <input type="date" value={form.dateTo} onChange={(event) => change("dateTo", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2" />
            {/* NSU e chave sao opcionais. Eles so fazem sentido quando o modo
                de consulta escolhido exige um valor especifico. */}
            <input value={form.nsu} onChange={(event) => change("nsu", event.target.value)} placeholder="NSU manual opcional" className="rounded-md border border-slate-200 px-3 py-2" />
            <input value={form.accessKey} onChange={(event) => change("accessKey", event.target.value)} placeholder="Chave NF-e para consulta por chave" className="rounded-md border border-slate-200 px-3 py-2" />
          </div>

          <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
            {/* Checkboxes: informam a intencao do usuario para XML/PDF e
                manifestacao automatica. O backend/provedor pode usar essas
                flags para baixar arquivos e registrar ciencia da operacao. */}
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.includeXml} onChange={(event) => change("includeXml", event.target.checked)} />Baixar XML</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.includePdf} onChange={(event) => change("includePdf", event.target.checked)} />Baixar PDF/DANFE</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.manifest} onChange={(event) => change("manifest", event.target.checked)} />Manifestar ciencia automaticamente</label>
          </div>

          {/* Botao principal da tela: dispara submit(), envia os filtros para a
              API e salva no cofre os documentos retornados. */}
          <Button className="mt-5 w-full" disabled={loading || !form.companyId}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : <SearchCheck size={16} />}
            {loading ? "Buscando..." : "Buscar NFs"}
          </Button>
        </Card>

        <Card title="Fluxo operacional" icon={CheckCircle2}>
          <div className="space-y-3 text-sm text-slate-600">
            {["Validar certificado da empresa", "Consultar SEFAZ ou prefeitura", "Baixar XML/PDF", "Indexar no cofre", "Registrar auditoria"].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-md border border-slate-200 p-3">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-ocean text-xs font-bold text-white">{index + 1}</span>
                {item}
              </div>
            ))}
          </div>
          {message && <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">{message}</p>}
        </Card>
      </form>
    </div>
  );
}
