import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  sefazIntegrationEnabled: process.env.SEFAZ_INTEGRATION_ENABLED === "true"
};
