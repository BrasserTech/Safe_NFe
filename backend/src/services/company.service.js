import { companies } from "../mocks/companies.mock.js";

export function listCompanies() {
  return companies;
}

export function createCompany(payload) {
  return {
    id: `cmp-${Date.now()}`,
    ...payload,
    status: payload.status || "Ativa"
  };
}
