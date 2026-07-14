import { Building2, FileSearch, FileText, History, Home, Link2 } from "lucide-react";
import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Header } from "./Header.jsx";
import { Sidebar } from "./Sidebar.jsx";

const mobileLinks = [
  { to: "/app", label: "Inicio", icon: Home, end: true },
  { to: "/app/empresas", label: "Empresas", icon: Building2 },
  { to: "/app/documentos", label: "Docs", icon: FileText },
  { to: "/app/captura", label: "Captura", icon: FileSearch },
  { to: "/app/integracoes", label: "Integr.", icon: Link2 },
  { to: "/app/auditoria", label: "Audit.", icon: History }
];

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 lg:pb-0">
      <Sidebar />
      <main className="lg:pl-72">
        <Header />
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      {/* Navegacao movel equivalente ao menu lateral. Mantem o app utilizavel
          em tablet/celular sem duplicar telas ou criar rotas alternativas. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-slate-200 bg-white shadow-soft lg:hidden">
        {mobileLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                isActive ? "text-ocean" : "text-slate-500"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
