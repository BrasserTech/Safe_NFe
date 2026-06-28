import * as invoiceService from "../services/invoice.service.js";

export function index(_req, res) {
  res.json(invoiceService.listInvoices());
}

export function show(req, res) {
  const invoice = invoiceService.getInvoiceById(req.params.id);

  if (!invoice) {
    return res.status(404).json({ message: "Nota fiscal nao encontrada." });
  }

  return res.json(invoice);
}

export function manifest(req, res) {
  const updated = invoiceService.manifestInvoice(req.params.id, req.body.manifestStatus);

  if (!updated) {
    return res.status(404).json({ message: "Nota fiscal nao encontrada." });
  }

  return res.json(updated);
}

export function ctes(_req, res) {
  res.json(invoiceService.listCtes());
}
