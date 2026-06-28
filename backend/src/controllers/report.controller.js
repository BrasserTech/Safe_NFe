import * as reportService from "../services/report.service.js";

export function index(_req, res) {
  res.json(reportService.getReports());
}
