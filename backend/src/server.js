import cors from "cors";
import rateLimit from "express-rate-limit";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import routes from "./routes/index.js";

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim());

// CORS aceita localhost e 127.0.0.1 porque o Vite sobe em 127.0.0.1 por padrao
// neste projeto, enquanto a API e documentada em localhost.
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origem nao permitida pelo CORS: ${origin}`));
  }
}));
// Headers de seguranca padrao: reduz risco de sniffing, clickjacking e exposicao
// de detalhes do Express em respostas HTTP.
app.use(helmet());

// Limita JSON recebido. Sem isso, um atacante poderia enviar payload enorme e
// consumir memoria do processo.
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));

// Rate limit geral para reduzir abuso de API. Mantem folga para uso local.
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.API_RATE_LIMIT || 600),
  standardHeaders: true,
  legacyHeaders: false
}));
app.use(morgan("dev"));

app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`FiscalVault API rodando em http://localhost:${env.port}`);
});
