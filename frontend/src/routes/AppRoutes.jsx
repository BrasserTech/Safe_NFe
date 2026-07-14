import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout.jsx";
import { Audit } from "../pages/Audit.jsx";
import { Capture } from "../pages/Capture.jsx";
import { Companies } from "../pages/Companies.jsx";
import { Dashboard } from "../pages/Dashboard.jsx";
import { Documents } from "../pages/Documents.jsx";
import { Integrations } from "../pages/Integrations.jsx";
import { LandingPage } from "../pages/LandingPage.jsx";
import { Login } from "../pages/Login.jsx";
import { Register } from "../pages/Register.jsx";

function ProtectedRoute() {
  const token = localStorage.getItem("safe-nfe-token");
  return token ? <AppLayout /> : <Navigate to="/login" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Register />} />
      <Route path="/app" element={<ProtectedRoute />}>
        <Route index element={<Dashboard />} />
        {/* Estrutura operacional do Safe NFe: os documentos fiscais ficam
            centralizados em Documentos, e certificados ficam dentro de
            Empresas. As rotas antigas permanecem como redirecionamento para
            nao quebrar favoritos, atalhos ou links enviados aos usuarios. */}
        <Route path="notas" element={<Documents />} />
        <Route path="documentos" element={<Documents />} />
        <Route path="ctes" element={<Navigate to="/app/documentos?tipo=CT-e" replace />} />
        <Route path="captura" element={<Capture />} />
        <Route path="manifestacao" element={<Navigate to="/app/documentos?manifestacao=pendente" replace />} />
        <Route path="empresas" element={<Companies />} />
        <Route path="certificados" element={<Navigate to="/app/empresas" replace />} />
        <Route path="relatorios" element={<Navigate to="/app" replace />} />
        <Route path="contador" element={<Navigate to="/app/integracoes" replace />} />
        <Route path="integracoes" element={<Integrations />} />
        <Route path="auditoria" element={<Audit />} />
        <Route path="configuracoes" element={<Navigate to="/app/integracoes" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
