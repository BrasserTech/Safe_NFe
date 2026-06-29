import { CheckCircle2, FileKey2, Loader2, Save, ShieldCheck, UploadCloud, XCircle } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { mockCompanies } from "../data/mockData.js";
import { api } from "../services/api.js";

const statusTone = {
  valido: "green",
  vencido: "red",
  senha_incorreta: "red",
  invalido: "red"
};

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function CertificateInfo({ certificate }) {
  if (!certificate) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        Nenhum certificado validado ainda.
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-2">
      <div>
        <span className="block text-xs font-semibold uppercase text-slate-500">Titular</span>
        <strong className="mt-1 block text-navy">{certificate.titular || "-"}</strong>
      </div>
      <div>
        <span className="block text-xs font-semibold uppercase text-slate-500">CNPJ/CPF</span>
        <strong className="mt-1 block text-navy">{certificate.documento || "Nao identificado"}</strong>
      </div>
      <div>
        <span className="block text-xs font-semibold uppercase text-slate-500">Validade</span>
        <strong className="mt-1 block text-navy">{formatDate(certificate.validade)}</strong>
      </div>
      <div>
        <span className="block text-xs font-semibold uppercase text-slate-500">Status</span>
        <div className="mt-1">
          <Badge tone={statusTone[certificate.status] || "gray"}>{certificate.status || "pendente"}</Badge>
        </div>
      </div>
    </div>
  );
}

export function Settings() {
  const [activeTab, setActiveTab] = useState("certificado");
  const [companyId, setCompanyId] = useState(mockCompanies[0]?.id || "");
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [validatedCertificate, setValidatedCertificate] = useState(null);
  const [currentCertificate, setCurrentCertificate] = useState(null);

  const selectedCompany = useMemo(
    () => mockCompanies.find((company) => company.id === companyId),
    [companyId]
  );

  function changeFile(event) {
    const selectedFile = event.target.files?.[0];
    setMessage(null);
    setValidatedCertificate(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!["pfx", "p12"].includes(extension)) {
      setFile(null);
      event.target.value = "";
      setMessage({ type: "error", text: "Envie um arquivo .pfx ou .p12." });
      return;
    }

    setFile(selectedFile);
  }

  function buildPayload() {
    const formData = new FormData();
    formData.append("certificado", file);
    formData.append("senha", password);
    return formData;
  }

  function validateForm() {
    if (!companyId) {
      setMessage({ type: "error", text: "Selecione uma empresa." });
      return false;
    }

    if (!file) {
      setMessage({ type: "error", text: "Selecione o certificado digital." });
      return false;
    }

    if (!password) {
      setMessage({ type: "error", text: "Informe a senha do certificado." });
      return false;
    }

    return true;
  }

  async function testCertificate() {
    if (!validateForm()) {
      return;
    }

    setTesting(true);
    setMessage(null);

    try {
      const response = await api.post(`/empresas/${companyId}/certificado/testar`, buildPayload());
      setValidatedCertificate(response.data.certificate);
      setMessage({ type: "success", text: "Certificado validado com sucesso." });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Nao foi possivel testar o certificado." });
    } finally {
      setTesting(false);
    }
  }

  async function saveCertificate() {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await api.post(`/empresas/${companyId}/certificado`, buildPayload());
      setCurrentCertificate(response.data.certificate);
      setValidatedCertificate(response.data.certificate);
      setMessage({ type: "success", text: response.data.message || "Certificado salvo com sucesso." });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Nao foi possivel salvar o certificado." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-navy">Configuracoes</h2>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("certificado")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === "certificado"
              ? "border-ocean text-ocean"
              : "border-transparent text-slate-500 hover:text-navy"
          }`}
        >
          <FileKey2 size={17} />
          Certificado Digital
        </button>
      </div>

      {activeTab === "certificado" && (
        <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
          <Card title="Certificado Digital A1">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-slate-700">
                  Empresa
                  <select
                    value={companyId}
                    onChange={(event) => {
                      setCompanyId(event.target.value);
                      setCurrentCertificate(null);
                      setValidatedCertificate(null);
                      setMessage(null);
                    }}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-navy outline-none focus:border-ocean focus:ring-2 focus:ring-blue-100"
                  >
                    {mockCompanies.map((company) => (
                      <option key={company.id} value={company.id}>{company.legalName}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-semibold text-slate-700">
                  Senha do certificado
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Senha do A1"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal text-navy outline-none focus:border-ocean focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-ocean hover:bg-blue-50">
                <UploadCloud className="text-ocean" size={28} />
                <span className="text-sm font-semibold text-navy">
                  {file ? file.name : "Selecionar certificado .pfx ou .p12"}
                </span>
                <span className="text-xs text-slate-500">O arquivo sera enviado apenas ao testar ou salvar.</span>
                <input type="file" accept=".pfx,.p12" onChange={changeFile} className="sr-only" />
              </label>

              {message && (
                <div
                  className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
                    message.type === "success"
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                      : "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                  }`}
                >
                  {message.type === "success" ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                  <span>{message.text}</span>
                </div>
              )}

              <CertificateInfo certificate={validatedCertificate} />

              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="secondary" onClick={testCertificate} disabled={testing || saving}>
                  {testing ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                  Testar certificado
                </Button>
                <Button type="button" onClick={saveCertificate} disabled={testing || saving}>
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Salvar certificado
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Certificado atual">
            <div className="space-y-4 text-sm text-slate-600">
              <div className="rounded-md bg-skysoft p-4">
                <span className="block text-xs font-semibold uppercase text-ocean">Empresa selecionada</span>
                <strong className="mt-1 block text-navy">{selectedCompany?.legalName}</strong>
                <span className="mt-1 block">{selectedCompany?.cnpj}</span>
              </div>
              <CertificateInfo certificate={currentCertificate} />
              <div className="rounded-md border border-slate-200 p-4">
                <p className="font-semibold text-navy">Preparado para SEFAZ</p>
                <p className="mt-1">
                  O certificado salvo fica associado a empresa e podera ser reutilizado na futura consulta
                  NFeDistribuicaoDFe.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
