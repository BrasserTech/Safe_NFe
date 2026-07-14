import * as dashboardService from "../services/dashboard.service.js";

export async function index(_req, res, next) {
  try {
    res.json(await dashboardService.getDashboard());
  } catch (error) {
    next(error);
  }
}
