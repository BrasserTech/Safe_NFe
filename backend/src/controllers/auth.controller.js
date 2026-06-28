import * as authService from "../services/auth.service.js";

export function login(req, res) {
  res.json(authService.login(req.body));
}

export function register(req, res) {
  res.status(201).json(authService.register(req.body));
}
