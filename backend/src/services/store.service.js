import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";

const dataRoot = path.resolve(process.cwd(), "storage");
const dataFile = path.join(dataRoot, "safe-nfe-data.json");

// Armazenamento local usado para deixar o produto testavel sem PostgreSQL.
// Em producao, esta camada deve ser substituida por repositorios Prisma mantendo
// o mesmo contrato dos services: readStore, writeStore e updateStore.
function now() {
  return new Date().toISOString();
}

function adminSeedConfig() {
  const email = process.env.ADMIN_EMAIL || "admin@safe-nfe.local";
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const password = process.env.ADMIN_PASSWORD;

  if (process.env.NODE_ENV === "production" && !passwordHash && !password) {
    throw new Error("Configure ADMIN_PASSWORD_HASH ou ADMIN_PASSWORD antes da primeira execucao em producao.");
  }

  return {
    email,
    passwordHash: passwordHash || bcrypt.hashSync(password || "123456", 10)
  };
}

// Seed inicial criado automaticamente na primeira execucao.
// Mantem somente o usuario admin necessario para acesso inicial. Em producao,
// exige ADMIN_PASSWORD_HASH ou ADMIN_PASSWORD para evitar senha padrao.
function initialData() {
  const admin = adminSeedConfig();
  return {
    users: [
      {
        id: "usr-admin",
        name: "Administrador",
        email: admin.email,
        username: "admin",
        passwordHash: admin.passwordHash,
        role: "ADMIN",
        createdAt: now(),
        updatedAt: now()
      }
    ],
    companies: [],
    certificates: [],
    documents: [],
    auditLogs: [],
    settings: {
      storageMode: "local-json",
      sefazIntegrationEnabled: process.env.SEFAZ_INTEGRATION_ENABLED === "true",
      nfseIntegrationEnabled: process.env.NFSE_INTEGRATION_ENABLED === "true"
    }
  };
}

// Le o arquivo de armazenamento. Se ele ainda nao existir, cria com os dados
// iniciais para que o sistema funcione imediatamente apos npm install.
export async function readStore() {
  await fs.mkdir(dataRoot, { recursive: true });

  try {
    const content = await fs.readFile(dataFile, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    const data = initialData();
    await writeStore(data);
    return data;
  }
}

// Grava todo o estado no disco. A escrita e simples por ser ambiente local; em
// producao, evitar gravacao concorrente em arquivo e usar transacoes no banco.
export async function writeStore(data) {
  await fs.mkdir(dataRoot, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
  return data;
}

// Padrao de atualizacao centralizado: carrega, aplica uma mutacao e persiste.
// Services usam isso para manter regra de negocio em um so lugar.
export async function updateStore(mutator) {
  const data = await readStore();
  const result = await mutator(data);
  await writeStore(data);
  return result;
}

export { dataRoot };
