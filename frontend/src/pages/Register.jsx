import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button.jsx";
import { api } from "../services/api.js";

export function Register() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    try {
      await api.post("/auth/register", {
        name: form.get("responsibleName"),
        email: form.get("email"),
        password: form.get("password")
      });
      setMessage("Conta criada. Entre com seu e-mail e senha.");
      setTimeout(() => navigate("/login"), 800);
    } catch (error) {
      setMessage(error.response?.data?.message || "Nao foi possivel criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-black text-navy">Criar conta</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Nome do responsavel
            <input name="responsibleName" className="mt-2 w-full rounded-md border border-slate-200 px-3 py-3 outline-ocean" type="text" required />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            E-mail
            <input name="email" className="mt-2 w-full rounded-md border border-slate-200 px-3 py-3 outline-ocean" type="email" required autoComplete="username" />
          </label>
          <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
            Senha
            <input name="password" className="mt-2 w-full rounded-md border border-slate-200 px-3 py-3 outline-ocean" type="password" minLength={6} required autoComplete="new-password" />
          </label>
        </div>
        {message && <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">{message}</p>}
        <Button className="mt-6 w-full" type="submit" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</Button>
        <p className="mt-4 text-center text-sm text-slate-600">Ja tem acesso? <Link className="font-bold text-ocean" to="/login">Entrar</Link></p>
      </form>
    </main>
  );
}
