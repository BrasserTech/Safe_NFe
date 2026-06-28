import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button.jsx";

export function Login() {
  const navigate = useNavigate();

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form onSubmit={(event) => { event.preventDefault(); navigate("/app"); }} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-black text-navy">Entrar no FiscalVault</h1>
        <label className="mt-6 block text-sm font-semibold text-slate-700">E-mail</label>
        <input className="mt-2 w-full rounded-md border border-slate-200 px-3 py-3 outline-ocean" type="email" placeholder="voce@empresa.com.br" required />
        <label className="mt-4 block text-sm font-semibold text-slate-700">Senha</label>
        <input className="mt-2 w-full rounded-md border border-slate-200 px-3 py-3 outline-ocean" type="password" placeholder="Sua senha" required />
        <Button className="mt-6 w-full" type="submit">Entrar</Button>
        <p className="mt-4 text-center text-sm text-slate-600">Ainda nao tem conta? <Link className="font-bold text-ocean" to="/cadastro">Criar cadastro</Link></p>
      </form>
    </main>
  );
}
