import * as settingsService from "../services/settings.service.js";

export function index(_req, res) {
  res.json(settingsService.getSettings());
}
