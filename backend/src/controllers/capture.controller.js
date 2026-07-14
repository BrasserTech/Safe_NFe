import * as captureService from "../services/capture.service.js";

// Entrada HTTP para consulta SEFAZ Distribuicao DFe.
// O service decide se roda modo local ou se exige adaptador real.
export async function sefazDistribution(req, res, next) {
  try {
    res.json(await captureService.captureSefazDistribution(req.body));
  } catch (error) {
    next(error);
  }
}

// Entrada HTTP para NFS-e nacional/municipal.
// Mantem contrato semelhante ao SEFAZ para a tela Captura.
export async function nfseNational(req, res, next) {
  try {
    res.json(await captureService.captureNfseNational(req.body));
  } catch (error) {
    next(error);
  }
}
