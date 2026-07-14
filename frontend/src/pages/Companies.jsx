import { Building2, FileKey2, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Table } from "../components/ui/Table.jsx";
import { api } from "../services/api.js";

function onlyDigits(value = "") {
  // Remove mascara do CNPJ antes de enviar ao backend. Assim o cadastro aceita
  // "12.345.678/0001-99" e salva como "12345678000199".
  return String(value).replace(/\D/g, "");
}

export function Companies() {
  const [activeTab, setActiveTab] = useState("manual");
  const [companies, setCompanies] = useState([]);
  const [message, setMessage] = useState("");
  const [certificateFile, setCertificateFile] = useState(null);
  const [certificatePassword, setCertificatePassword] = useState("");
  const [certificateInfo, setCertificateInfo] = useState(null);
  const [certificateCompanyName, setCertificateCompanyName] = useState("");
  const [loadingCertificate, setLoadingCertificate] = useState(false);

  // Empresas sao persistidas no backend e compartilhadas com:
  // - Captura: para escolher qual CNPJ sera consultado.
  // - Certificado A1: para vincular a credencial fiscal correta.
  // - Documentos: para mostrar de qual empresa e cada XML/PDF.
  async function load() {
    const response = await api.get("/companies");
    setCompanies(response.data);
  }

  useEffect(() => {
    load().catch(() => setMessage("Nao foi possivel carregar empresas."));
  }, []);

  // Cria empresa usando cadastro manual. Os dados vêm dos inputs da aba
  // "Cadastro manual". O backend valida se o CNPJ tem 14 digitos e se ja existe.
  async function submitManual(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.post("/companies", {
        legalName: form.get("legalName"),
        cnpj: onlyDigits(form.get("cnpj")),
        certificateLabel: "Certificado pendente",
        status: form.get("status")
      });
      event.currentTarget.reset();
      setMessage("Empresa cadastrada.");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Nao foi possivel cadastrar empresa.");
    }
  }

  // Monta FormData do certificado. Esse mesmo payload e usado para validar,
  // cadastrar a empresa e vincular o certificado A1.
  function certificatePayload(extra = {}) {
    const formData = new FormData();
    formData.append("certificado", certificateFile);
    formData.append("senha", certificatePassword);
    Object.entries(extra).forEach(([key, value]) => formData.append(key, value || ""));
    return formData;
  }

  // Botao "Validar e puxar dados":
  // envia o arquivo .pfx/.p12 e a senha para o backend abrir o certificado.
  // O backend devolve titular, CNPJ/CPF, validade e status. Esses dados vêm
  // de dentro do certificado, nao sao digitados manualmente.
  async function validateCertificate() {
    if (!certificateFile || !certificatePassword) {
      setMessage("Selecione o certificado e informe a senha.");
      return;
    }

    setLoadingCertificate(true);
    setMessage("");
    try {
      const response = await api.post("/certificates/validate", certificatePayload());
      setCertificateInfo(response.data.certificate);
      setCertificateCompanyName(response.data.certificate.titular || "");
      setMessage("Certificado validado. Confira os dados antes de cadastrar/vincular.");
    } catch (error) {
      setCertificateInfo(null);
      setMessage(error.response?.data?.message || "Nao foi possivel validar o certificado.");
    } finally {
      setLoadingCertificate(false);
    }
  }

  // Botao "Cadastrar/vincular":
  // usa o CNPJ extraido do certificado para criar a empresa, ou atualiza a
  // empresa existente. Em seguida salva o A1 para futuras consultas fiscais.
  async function createFromCertificate() {
    if (!certificateInfo) {
      setMessage("Valide o certificado antes de cadastrar.");
      return;
    }

    setLoadingCertificate(true);
    setMessage("");
    try {
      await api.post("/companies/from-certificate", certificatePayload({
        legalName: certificateCompanyName || certificateInfo.titular
      }));
      setCertificateFile(null);
      setCertificatePassword("");
      setCertificateInfo(null);
      setCertificateCompanyName("");
      setMessage("Empresa cadastrada/vinculada pelo certificado.");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Nao foi possivel cadastrar pelo certificado.");
    } finally {
      setLoadingCertificate(false);
    }
  }

  // Botao de lixeira na tabela:
  // remove a empresa e os dados vinculados no armazenamento local.
  async function remove(id) {
    await api.delete(`/companies/${id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy">Empresas</h2>
        <p className="text-slate-500">Cadastre empresas manualmente ou a partir do certificado digital A1.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {/* Aba Cadastro manual: usada quando o usuario quer informar CNPJ e
            razao social sem depender primeiro do certificado. */}
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === "manual" ? "border-ocean text-ocean" : "border-transparent text-slate-500 hover:text-navy"
          }`}
        >
          <Building2 size={17} />
          Cadastro manual
        </button>
        {/* Aba Certificado A1: usada quando o usuario quer puxar CNPJ/titular
            direto do arquivo do certificado e ja vincular a empresa. */}
        <button
          type="button"
          onClick={() => setActiveTab("certificate")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === "certificate" ? "border-ocean text-ocean" : "border-transparent text-slate-500 hover:text-navy"
          }`}
        >
          <FileKey2 size={17} />
          Certificado A1
        </button>
      </div>

      {activeTab === "manual" && (
        <form onSubmit={submitManual} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-soft md:grid-cols-4">
          {/* Razao social e CNPJ sao enviados para POST /companies. */}
          <input name="legalName" required placeholder="Razao social" className="rounded-md border border-slate-200 px-3 py-2 md:col-span-2" />
          <input name="cnpj" required placeholder="CNPJ" className="rounded-md border border-slate-200 px-3 py-2" />
          {/* Status inicial ajuda a diferenciar empresa pronta de empresa ainda
              sem certificado valido. */}
          <select name="status" className="rounded-md border border-slate-200 px-3 py-2">
            <option>Certificado pendente</option>
            <option>Ativa</option>
            <option>Inativa</option>
          </select>
          {/* Adicionar empresa: cria o cadastro manual no backend. */}
          <Button className="md:col-span-4"><Plus size={16} />Adicionar empresa</Button>
        </form>
      )}

      {activeTab === "certificate" && (
        <Card title="Cadastrar e vincular por certificado A1" icon={FileKey2}>
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-3">
              {/* Arquivo do certificado A1. Aceita .pfx e .p12, que sao os
                  formatos usados para consulta fiscal com certificado digital. */}
              <input
                type="file"
                accept=".pfx,.p12"
                onChange={(event) => {
                  setCertificateFile(event.target.files?.[0] || null);
                  setCertificateInfo(null);
                  setCertificateCompanyName("");
                }}
                className="w-full rounded-md border border-slate-200 px-3 py-2"
              />
              {/* Senha do certificado. Ela e enviada ao backend para validar o
                  A1 e salva criptografada quando o certificado e vinculado. */}
              <input
                type="password"
                value={certificatePassword}
                onChange={(event) => setCertificatePassword(event.target.value)}
                placeholder="Senha do certificado"
                className="w-full rounded-md border border-slate-200 px-3 py-2"
              />
              <div className="flex flex-wrap gap-2">
                {/* Valida o arquivo e puxa dados de dentro do certificado. */}
                <Button type="button" variant="secondary" onClick={validateCertificate} disabled={loadingCertificate}>
                  {loadingCertificate ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                  Validar e puxar dados
                </Button>
                {/* Cadastra ou atualiza empresa e vincula o certificado A1. */}
                <Button type="button" onClick={createFromCertificate} disabled={loadingCertificate || !certificateInfo}>
                  {loadingCertificate ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  Cadastrar/vincular
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
              <label className="block font-semibold text-slate-700">
                Razao social extraida/editavel
                {/* Esse campo começa com o titular do certificado, mas fica
                    editavel porque alguns certificados trazem nome tecnico. */}
                <input
                  value={certificateCompanyName}
                  onChange={(event) => setCertificateCompanyName(event.target.value)}
                  placeholder="Valide o certificado para preencher"
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-normal"
                />
              </label>
              <div className="mt-4 grid gap-2 text-slate-600">
                {/* Dados abaixo vieram do certificado validado no backend. */}
                <p><strong>CNPJ/CPF:</strong> {certificateInfo?.documento || "-"}</p>
                <p><strong>Titular:</strong> {certificateInfo?.titular || "-"}</p>
                <p><strong>Validade:</strong> {certificateInfo?.validade ? new Intl.DateTimeFormat("pt-BR").format(new Date(certificateInfo.validade)) : "-"}</p>
                <p><strong>Status:</strong> {certificateInfo?.status || "-"}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {message && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">{message}</p>}

      <Table
        columns={[
          { key: "legalName", label: "Razao social" },
          { key: "cnpj", label: "CNPJ" },
          { key: "certificateLabel", label: "Certificado digital" },
          { key: "status", label: "Status", render: (row) => <Badge tone={row.status === "Ativa" ? "green" : "yellow"}>{row.status}</Badge> },
          { key: "actions", label: "Acoes", render: (row) => <Button type="button" variant="ghost" title="Remover" onClick={() => remove(row.id)}><Trash2 size={16} /></Button> }
        ]}
        rows={companies}
      />
    </div>
  );
}
