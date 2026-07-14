import fs from "fs/promises";
import path from "path";

const dataRoot = path.resolve(process.cwd(), "storage");
const dataFile = path.join(dataRoot, "safe-nfe-data.json");

// Armazenamento local usado para deixar o produto testavel sem PostgreSQL.
// Em producao, esta camada deve ser substituida por repositorios Prisma mantendo
// o mesmo contrato dos services: readStore, writeStore e updateStore.
function now() {
  return new Date().toISOString();
}

// Seed inicial criado automaticamente na primeira execucao.
// Mantem somente o usuario admin necessario para acesso inicial.
// Senha do admin: 123456. Trocar em ambiente real.
function initialData() {
  return {
    users: [
      {
        id: "usr-admin",
        name: "Administrador",
        email: "admin@safe-nfe.local",
        username: "admin",
        passwordHash: "$2b$10$VfNelyEf0xCT28iIHbWspui1EIDv.bEc59v4Dggv/CspPrgQ2Xjum",
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
