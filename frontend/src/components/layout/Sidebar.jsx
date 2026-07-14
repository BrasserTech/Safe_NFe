import { BarChart3, Building2, FileCheck2, FileSearch, FileText, History, Home, Landmark, Link2, Settings, Truck, Users } from "lucide-react";
import React from "react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/app", label: "Dashboard", icon: Home },
  { to: "/app/documentos", label: "Documentos", icon: FileText },
  { to: "/app/captura", label: "Captura", icon: FileSearch },
  { to: "/app/ctes", label: "CT-e", icon: Truck },
  { to: "/app/manifestacao", label: "Manifestacao", icon: FileCheck2 },
  { to: "/app/empresas", label: "Empresas", icon: Building2 },
  { to: "/app/relatorios", label: "Relatorios", icon: BarChart3 },
  { to: "/app/contador", label: "Contador", icon: Landmark },
  { to: "/app/integracoes", label: "Integracoes", icon: Link2 },
  { to: "/app/auditoria", label: "Auditoria", icon: History },
  { to: "/app/configuracoes", label: "Configuracoes", icon: Settings }
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-navy text-white lg:flex">
      <div className="flex h-20 items-center gap-3 px-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ocean font-black">FV</span>
        <div>
          <strong className="block text-lg">FiscalVault</strong>
          <span className="text-xs text-blue-100">Cofre fiscal eletronico</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/app"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold transition ${
                isActive ? "bg-white text-navy" : "text-blue-50 hover:bg-white/10"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="m-4 rounded-lg bg-white/10 p-4 text-sm text-blue-50">
        <Users className="mb-3" size={20} />
        Cofre local com certificados, captura, documentos, downloads e auditoria.
      </div>
    </aside>
  );
}
