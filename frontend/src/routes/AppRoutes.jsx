import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout.jsx";
import { Accountant } from "../pages/Accountant.jsx";
import { Companies } from "../pages/Companies.jsx";
import { Ctes } from "../pages/Ctes.jsx";
import { Dashboard } from "../pages/Dashboard.jsx";
import { Invoices } from "../pages/Invoices.jsx";
import { LandingPage } from "../pages/LandingPage.jsx";
import { Login } from "../pages/Login.jsx";
import { Manifestation } from "../pages/Manifestation.jsx";
import { Register } from "../pages/Register.jsx";
import { Reports } from "../pages/Reports.jsx";
import { Settings } from "../pages/Settings.jsx";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Register />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="notas" element={<Invoices />} />
        <Route path="ctes" element={<Ctes />} />
        <Route path="manifestacao" element={<Manifestation />} />
        <Route path="empresas" element={<Companies />} />
        <Route path="relatorios" element={<Reports />} />
        <Route path="contador" element={<Accountant />} />
        <Route path="configuracoes" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
