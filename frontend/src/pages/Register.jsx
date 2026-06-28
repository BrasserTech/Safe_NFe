import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button.jsx";

export function Register() {
  const navigate = useNavigate();

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <form onSubmit={(event) => { event.preventDefault(); navigate("/app"); }} className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-black text-navy">Criar conta</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {["Nome da empresa", "CNPJ", "Nome do responsavel", "E-mail", "Senha"].map((field) => (
            <label key={field} className="block text-sm font-semibold text-slate-700">
              {field}
              <input className="mt-2 w-full rounded-md border border-slate-200 px-3 py-3 outline-ocean" type={field === "Senha" ? "password" : field === "E-mail" ? "email" : "text"} required />
            </label>
          ))}
        </div>
        <Button className="mt-6 w-full" type="submit">Criar conta</Button>
        <p className="mt-4 text-center text-sm text-slate-600">Ja tem acesso? <Link className="font-bold text-ocean" to="/login">Entrar</Link></p>
      </form>
    </main>
  );
}
