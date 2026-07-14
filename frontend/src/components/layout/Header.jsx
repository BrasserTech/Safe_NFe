import { Bell, Search } from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export function Header() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  // A busca global leva para Documentos porque ali ficam todos os tipos fiscais.
  // O parametro evita estado global e permite compartilhar a URL do filtro.
  function submitSearch(event) {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/app/documentos?busca=${encodeURIComponent(trimmed)}` : "/app/documentos");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-20 items-center justify-between gap-4 px-4 lg:px-8">
        <div>
          <p className="text-sm text-slate-500">Ambiente</p>
          <h1 className="text-lg font-bold text-navy">Safe NFe</h1>
        </div>
        <form onSubmit={submitSearch} className="hidden w-full max-w-md items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
          <Search size={18} className="text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Buscar documentos, empresas ou CNPJ"
          />
        </form>
        <Link to="/app/auditoria" title="Abrir auditoria" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600">
          <Bell size={18} />
        </Link>
      </div>
    </header>
  );
}
