import { getDocumentById, listDocuments, manifestDocument } from "./document.service.js";

export async function listInvoices() {
  const documents = await listDocuments();
  return documents.filter((document) => document.type !== "CT-e");
}

export function getInvoiceById(id) {
  return getDocumentById(id);
}

export function manifestInvoice(id, manifestStatus) {
  return manifestDocument(id, manifestStatus);
}

export async function listCtes() {
  const documents = await listDocuments();
  return documents.filter((document) => document.type === "CT-e");
}
