import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, register } from "../controllers/auth.controller.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente." }
});

router.post("/login", loginLimiter, login);
router.post("/register", register);

export default router;
