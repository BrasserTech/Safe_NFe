import dotenv from "dotenv";

dotenv.config();

const weakSecrets = new Set([
  "safe-nfe-development-secret",
  "troque-este-segredo-em-producao",
  "troque-este-segredo-para-criptografar-senhas-de-certificado"
]);

if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || weakSecrets.has(process.env.JWT_SECRET)) {
    throw new Error("Configure JWT_SECRET forte antes de iniciar em producao.");
  }

  if (!process.env.CERTIFICATE_SECRET || weakSecrets.has(process.env.CERTIFICATE_SECRET)) {
    throw new Error("Configure CERTIFICATE_SECRET forte antes de iniciar em producao.");
  }
}

export const env = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  sefazIntegrationEnabled: process.env.SEFAZ_INTEGRATION_ENABLED === "true"
};
