import * as certificateService from "../services/certificate.service.js";

function handleError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      message: error.message,
      status: error.certificateStatus
    });
  }

  return next(error);
}

export async function show(req, res, next) {
  try {
    res.json({ certificate: await certificateService.getCurrentCertificate(req.params.id) });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function test(req, res, next) {
  try {
    res.json(await certificateService.testCertificate(req.params.id, req.file, req.body.senha || req.body.password));
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function store(req, res, next) {
  try {
    const result = await certificateService.saveCertificate(req.params.id, req.file, req.body.senha || req.body.password);
    res.status(201).json(result);
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function index(_req, res, next) {
  try {
    res.json(await certificateService.listCertificates());
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function createFromCertificate(req, res, next) {
  try {
    const result = await certificateService.createCompanyFromCertificate(
      req.file,
      req.body.senha || req.body.password,
      req.body
    );
    res.status(201).json(result);
  } catch (error) {
    handleError(error, res, next);
  }
}

export function validateStandalone(req, res, next) {
  try {
    res.json(certificateService.validateCertificate(req.file, req.body.senha || req.body.password));
  } catch (error) {
    handleError(error, res, next);
  }
}
