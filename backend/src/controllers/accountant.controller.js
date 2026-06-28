import { companies } from "../mocks/companies.mock.js";

export function companiesIndex(_req, res) {
  res.json(
    companies.map((company, index) => ({
      ...company,
      monthlyFolder: `2026/${String(index + 4).padStart(2, "0")}`,
      closingStatus: index === 1 ? "Pendente" : "Fechado",
      xmlBatchAvailable: index !== 1
    }))
  );
}
