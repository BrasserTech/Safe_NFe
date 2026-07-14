import { randomUUID } from "crypto";
import { addAuditLog } from "./audit.service.js";
import { readStore, updateStore } from "./store.service.js";

function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

export async function listCompanies() {
  const data = await readStore();
  return data.companies;
}

export async function getCompanyById(id) {
  const data = await readStore();
  return data.companies.find((company) => company.id === id || onlyDigits(company.cnpj) === onlyDigits(id));
}

export async function createCompany(payload) {
  const cnpj = onlyDigits(payload.cnpj);

  if (cnpj.length !== 14) {
    const error = new Error("Informe um CNPJ com 14 digitos.");
    error.statusCode = 400;
    throw error;
  }

  const company = await updateStore((data) => {
    if (data.companies.some((item) => onlyDigits(item.cnpj) === cnpj)) {
      const error = new Error("Empresa ja cadastrada para este CNPJ.");
      error.statusCode = 409;
      throw error;
    }

    const record = {
      id: randomUUID(),
      legalName: payload.legalName || payload.name || `Empresa ${cnpj}`,
      tradeName: payload.tradeName || "",
      cnpj,
      certificateLabel: payload.certificateLabel || "Certificado pendente",
      status: payload.status || "Certificado pendente",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.companies.unshift(record);
    return record;
  });

  await addAuditLog({
    title: "Empresa cadastrada",
    detail: `${company.legalName} (${company.cnpj})`,
    type: "company",
    metadata: { companyId: company.id }
  });

  return company;
}

export async function deleteCompany(id) {
  const removed = await updateStore((data) => {
    const company = data.companies.find((item) => item.id === id);
    data.companies = data.companies.filter((item) => item.id !== id);
    data.certificates = data.certificates.filter((item) => item.companyId !== id);
    data.documents = data.documents.filter((item) => item.companyId !== id);
    return company;
  });

  if (!removed) {
    const error = new Error("Empresa nao encontrada.");
    error.statusCode = 404;
    throw error;
  }

  await addAuditLog({
    title: "Empresa removida",
    detail: `${removed.legalName} (${removed.cnpj})`,
    type: "company",
    metadata: { companyId: id }
  });

  return removed;
}
