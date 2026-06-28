import * as dashboardService from "../services/dashboard.service.js";

export function index(_req, res) {
  res.json(dashboardService.getDashboard());
}
