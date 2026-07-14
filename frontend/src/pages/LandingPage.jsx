import { ArrowRight, BriefcaseBusiness, Cloud, FileSearch, LockKeyhole, ShieldCheck } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button.jsx";

const features = [
  ["Busca automatica de NF-e e CT-e", FileSearch],
  ["Cofre seguro para XML e DANFE", LockKeyhole],
  ["Manifestacao do destinatario", ShieldCheck],
  ["Relatorios gerenciais", BriefcaseBusiness],
  ["Organizacao por empresa, mes, ano, entrada e saida", Cloud],
  ["Seguranca, backup e area para contadores", ShieldCheck]
];

export function LandingPage() {
  return (
    <div className="bg-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-3 font-bold text-navy">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ocean text-white">FV</span>
          FiscalVault
        </div>
        <Link to="/login" className="text-sm font-semibold text-navy">Acessar sistema</Link>
      </header>

      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(29,116,216,.36),transparent_45%)]" />
        <div className="relative mx-auto grid min-h-[620px] max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-blue-200">Cofre fiscal eletronico</p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              Automatize a busca, organizacao e armazenamento das suas notas fiscais
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-blue-100">
              Uma plataforma SaaS para centralizar NF-e, CT-e, NFC-e e NFS-e, com fluxo preparado para SEFAZ,
              manifestacao, contabilidade e fechamento mensal.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/cadastro"><Button>Teste gratis por 30 dias <ArrowRight size={18} /></Button></Link>
              <Link to="/login"><Button variant="secondary">Acessar sistema</Button></Link>
            </div>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/10 p-5 shadow-soft backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-blue-100">Painel fiscal</span>
              <span className="rounded-md bg-emerald-400/20 px-2 py-1 text-xs font-bold text-emerald-100">Online</span>
            </div>
            <div className="grid gap-3">
              {["Cadastre empresas reais", "Vincule certificado A1", "Capture e armazene XML/PDF", "Acompanhe auditoria"].map((item) => (
                <div key={item} className="rounded-md bg-white p-4 font-semibold text-navy">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-16 md:grid-cols-2 lg:grid-cols-3">
        {features.map(([label, Icon]) => (
          <article key={label} className="rounded-lg border border-slate-200 p-6">
            <Icon className="mb-4 text-ocean" />
            <h2 className="text-lg font-bold text-navy">{label}</h2>
            <p className="mt-2 text-sm text-slate-600">Fluxos preparados para operacao com dados cadastrados pelo usuario.</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-lg bg-navy p-8 text-white md:flex md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">Comece com seus dados reais</h2>
            <p className="mt-2 text-blue-100">Cadastre uma empresa, vincule o certificado e valide o fluxo fiscal.</p>
          </div>
          <Link to="/cadastro" className="mt-6 inline-flex md:mt-0"><Button>Comecar agora</Button></Link>
        </div>
      </section>
    </div>
  );
}
