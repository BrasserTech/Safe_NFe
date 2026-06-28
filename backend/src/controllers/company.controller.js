import * as companyService from "../services/company.service.js";

export function index(_req, res) {
  res.json(companyService.listCompanies());
}

export function store(req, res) {
  res.status(201).json(companyService.createCompany(req.body));
}
