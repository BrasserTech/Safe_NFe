import * as invoiceService from "../services/invoice.service.js";

export async function index(_req, res, next) {
  try {
    res.json(await invoiceService.listInvoices());
  } catch (error) {
    next(error);
  }
}

export async function show(req, res, next) {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Nota fiscal nao encontrada." });
    }

    return res.json(invoice);
  } catch (error) {
    return next(error);
  }
}

export async function manifest(req, res, next) {
  try {
    const updated = await invoiceService.manifestInvoice(req.params.id, req.body.manifestStatus);

    if (!updated) {
      return res.status(404).json({ message: "Nota fiscal nao encontrada." });
    }

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

export async function ctes(_req, res, next) {
  try {
    res.json(await invoiceService.listCtes());
  } catch (error) {
    next(error);
  }
}
