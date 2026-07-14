import * as companyService from "../services/company.service.js";

export function index(_req, res) {
  companyService.listCompanies().then((companies) => res.json(companies));
}

export function store(req, res) {
  companyService.createCompany(req.body).then((company) => res.status(201).json(company));
}

export function destroy(req, res, next) {
  companyService.deleteCompany(req.params.id)
    .then((company) => res.json(company))
    .catch(next);
}
