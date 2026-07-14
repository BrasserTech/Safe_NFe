import { readStore } from "../services/store.service.js";

export async function companiesIndex(_req, res, next) {
  try {
    const data = await readStore();
    res.json(
      data.companies.map((company) => ({
        ...company,
        monthlyFolder: null,
        closingStatus: "Sem fechamento",
        xmlBatchAvailable: false
      }))
    );
  } catch (error) {
    next(error);
  }
}
