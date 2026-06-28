import { ctes, invoices } from "../mocks/documents.mock.js";

export function listInvoices() {
  return invoices;
}

export function getInvoiceById(id) {
  return invoices.find((invoice) => invoice.id === id);
}

export function manifestInvoice(id, manifestStatus) {
  const invoice = getInvoiceById(id);

  if (!invoice) {
    return null;
  }

  return {
    ...invoice,
    manifestStatus,
    manifestedAt: new Date().toISOString()
  };
}

export function listCtes() {
  return ctes;
}
