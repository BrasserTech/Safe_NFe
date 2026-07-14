import { Building2, FileKey2, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Table } from "../components/ui/Table.jsx";
import { api } from "../services/api.js";

function onlyDigits(value = "") {
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

  // Empresas sao persistidas no backend e compartilhadas com Captura,
  // Documentos, Manifestacao e Relatorios.
  async function load() {
    const response = await api.get("/companies");
    setCompanies(response.data);
  }

  useEffect(() => {
    load().catch(() => setMessage("Nao foi possivel carregar empresas."));
  }, []);

  // Cria empresa usando cadastro manual. O backend valida CNPJ e duplicidade.
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

  // Valida o A1 e preenche automaticamente os dados conhecidos do cadastro.
  // O certificado normalmente traz CNPJ/CPF e titular; a razao social fica
  // editavel porque alguns certificados trazem o nome em formato tecnico.
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

  // Cadastra empresa pelo CNPJ extraido do certificado e ja vincula o A1.
  // Se a empresa ja existir, o backend apenas atualiza o certificado dela.
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

  // Remove empresa e seus dados vinculados no armazenamento local.
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
          <input name="legalName" required placeholder="Razao social" className="rounded-md border border-slate-200 px-3 py-2 md:col-span-2" />
          <input name="cnpj" required placeholder="CNPJ" className="rounded-md border border-slate-200 px-3 py-2" />
          <select name="status" className="rounded-md border border-slate-200 px-3 py-2">
            <option>Certificado pendente</option>
            <option>Ativa</option>
            <option>Inativa</option>
          </select>
          <Button className="md:col-span-4"><Plus size={16} />Adicionar empresa</Button>
        </form>
      )}

      {activeTab === "certificate" && (
        <Card title="Cadastrar e vincular por certificado A1" icon={FileKey2}>
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-3">
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
              <input
                type="password"
                value={certificatePassword}
                onChange={(event) => setCertificatePassword(event.target.value)}
                placeholder="Senha do certificado"
                className="w-full rounded-md border border-slate-200 px-3 py-2"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={validateCertificate} disabled={loadingCertificate}>
                  {loadingCertificate ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                  Validar e puxar dados
                </Button>
                <Button type="button" onClick={createFromCertificate} disabled={loadingCertificate || !certificateInfo}>
                  {loadingCertificate ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  Cadastrar/vincular
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
              <label className="block font-semibold text-slate-700">
                Razao social extraida/editavel
                <input
                  value={certificateCompanyName}
                  onChange={(event) => setCertificateCompanyName(event.target.value)}
                  placeholder="Valide o certificado para preencher"
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-normal"
                />
              </label>
              <div className="mt-4 grid gap-2 text-slate-600">
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
