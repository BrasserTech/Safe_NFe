import * as settingsService from "../services/settings.service.js";

export function index(_req, res) {
  res.json(settingsService.getSettings());
}

export async function testDatabase(_req, res) {
  try {
    const result = await settingsService.testDatabaseConnection();
    res.json(result);
  } catch (error) {
    res.status(503).json({
      connected: false,
      message: "Nao foi possivel conectar ao banco de dados.",
      error: error.code || error.name || "DATABASE_CONNECTION_ERROR"
    });
  }
}
