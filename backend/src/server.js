import cors from "cors";
import express from "express";
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
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`FiscalVault API rodando em http://localhost:${env.port}`);
});
