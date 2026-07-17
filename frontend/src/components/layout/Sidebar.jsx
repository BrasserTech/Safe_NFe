import { Building2, FileSearch, FileText, History, Home, Link2, Settings } from "lucide-react";
import React from "react";
import { NavLink } from "react-router-dom";

// Menu principal mantem a organizacao operacional do Safe NFe:
// Dashboard, Empresas, Documentos, Captura, Integracoes e Auditoria.
// Certificados, CT-e, manifestacao e contador ficam dentro desses modulos.
const links = [
  // Cada item vira um botao do menu lateral. "to" e a rota aberta quando clica,
  // "label" e o texto mostrado no hover, e "icon" e o icone exibido recolhido.
  { to: "/app", label: "Dashboard", icon: Home },
  { to: "/app/empresas", label: "Empresas", icon: Building2 },
  { to: "/app/documentos", label: "Documentos", icon: FileText },
  { to: "/app/captura", label: "Captura", icon: FileSearch },
  { to: "/app/integracoes", label: "Integracoes", icon: Link2 },
  { to: "/app/auditoria", label: "Auditoria", icon: History }
];

export function Sidebar() {
  return (
    <aside className="group fixed inset-y-0 left-0 z-30 hidden w-20 flex-col overflow-hidden bg-navy text-white transition-[width] duration-300 hover:w-72 lg:flex">
      <div className="flex h-20 items-center gap-3 px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ocean font-black">FV</span>
        {/* Textos ficam ocultos no estado recolhido para manter a barra limpa.
            No hover, a largura aumenta e os labels aparecem sem remontar rotas. */}
        <div className="min-w-0 whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <strong className="block text-lg">FiscalVault</strong>
          <span className="text-xs text-blue-100">Cofre fiscal eletronico</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-x-hidden overflow-y-auto px-3 py-4">
        {links.map(({ to, label, icon: Icon }) => (
          // NavLink sabe sozinho se a rota atual esta ativa. Usamos isso para
          // pintar o botao selecionado sem controlar estado manualmente.
          <NavLink
            key={to}
            to={to}
            end={to === "/app"}
            title={label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold transition ${
                isActive ? "bg-white text-navy" : "text-blue-50 hover:bg-white/10"
              }`
            }
          >
            <Icon className="shrink-0" size={18} />
            <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 px-3 py-4">
        <NavLink
          to="/app/configuracoes"
          title="Configuracoes"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold transition ${
              isActive ? "bg-white text-navy" : "text-blue-50 hover:bg-white/10"
            }`
          }
        >
          <Settings className="shrink-0" size={18} />
          <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Configuracoes
          </span>
        </NavLink>
      </div>
    </aside>
  );
}
