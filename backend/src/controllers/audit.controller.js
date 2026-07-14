import * as auditService from "../services/audit.service.js";

export async function index(_req, res, next) {
  try {
    res.json(await auditService.listAuditLogs());
  } catch (error) {
    next(error);
  }
}
