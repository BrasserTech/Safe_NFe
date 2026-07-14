import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button.jsx";
import { api } from "../services/api.js";

export function Login() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Autentica na API e guarda o JWT para chamadas futuras.
  // Quando houver middleware de autorizacao, o interceptor em services/api.js
  // ja enviara este token automaticamente.
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    try {
      const response = await api.post("/auth/login", {
        email: form.get("email"),
        password: form.get("password")
      });
      localStorage.setItem("safe-nfe-token", response.data.token);
      localStorage.setItem("safe-nfe-user", JSON.stringify(response.data.user));
      navigate("/app");
    } catch (error) {
      setMessage(error.response?.data?.message || "Nao foi possivel entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-black text-navy">Entrar no FiscalVault</h1>
        <label className="mt-6 block text-sm font-semibold text-slate-700">E-mail</label>
        <input name="email" className="mt-2 w-full rounded-md border border-slate-200 px-3 py-3 outline-ocean" type="email" placeholder="admin@safe-nfe.local" required autoComplete="username" />
        <label className="mt-4 block text-sm font-semibold text-slate-700">Senha</label>
        <input name="password" className="mt-2 w-full rounded-md border border-slate-200 px-3 py-3 outline-ocean" type="password" placeholder="Sua senha" required autoComplete="current-password" />
        {message && <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p>}
        <Button className="mt-6 w-full" type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
        <p className="mt-4 text-center text-sm text-slate-600">Ainda nao tem conta? <Link className="font-bold text-ocean" to="/cadastro">Criar cadastro</Link></p>
      </form>
    </main>
  );
}
