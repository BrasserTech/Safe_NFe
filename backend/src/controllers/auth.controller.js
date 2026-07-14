import * as authService from "../services/auth.service.js";

export async function login(req, res, next) {
  try {
    res.json(await authService.login(req.body));
  } catch (error) {
    next(error);
  }
}

export async function register(req, res, next) {
  try {
    res.status(201).json(await authService.register(req.body));
  } catch (error) {
    next(error);
  }
}
