import * as reportService from "../services/report.service.js";

export async function index(_req, res, next) {
  try {
    res.json(await reportService.getReports());
  } catch (error) {
    next(error);
  }
}
