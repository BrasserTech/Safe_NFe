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

export function show(req, res, next) {
  try {
    res.json({ certificate: certificateService.getCurrentCertificate(req.params.id) });
  } catch (error) {
    handleError(error, res, next);
  }
}

export function test(req, res, next) {
  try {
    res.json(certificateService.testCertificate(req.params.id, req.file, req.body.senha));
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function store(req, res, next) {
  try {
    const result = await certificateService.saveCertificate(req.params.id, req.file, req.body.senha);
    res.status(201).json(result);
  } catch (error) {
    handleError(error, res, next);
  }
}
