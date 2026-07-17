import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { updateStore, readStore } from "./store.service.js";

const jwtSecret = process.env.JWT_SECRET || "safe-nfe-development-secret";

// Nunca retorne passwordHash para o frontend. Esta funcao define o contrato
// publico do usuario autenticado.
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role
  };
}

// Autentica por e-mail ou username. O token ainda nao e exigido nas rotas,
// mas ja fica pronto para adicionar middleware de autorizacao por perfil.
export async function login({ email, username, password }) {
  const data = await readStore();
  const loginId = String(email || username || "").toLowerCase();
  const user = data.users.find((item) => (
    item.email?.toLowerCase() === loginId ||
    item.username?.toLowerCase() === loginId
  ));

  const storedPassword = String(user?.passwordHash || "");
  const passwordMatches = storedPassword.startsWith("$2")
    ? await bcrypt.compare(password || "", storedPassword)
    : storedPassword === String(password || "");

  if (!user || !passwordMatches) {
    const error = new Error("Usuario ou senha invalidos.");
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: "8h" });

  return {
    token,
    user: publicUser(user)
  };
}

// Cadastro simples para uso operacional. Mantem hash bcrypt no armazenamento
// local e pode ser migrado diretamente para Prisma depois.
export async function register(payload) {
  if (process.env.ALLOW_PUBLIC_REGISTRATION !== "true") {
    const error = new Error("Cadastro publico desabilitado. Solicite a criacao de usuario a um administrador.");
    error.statusCode = 403;
    throw error;
  }

  const password = payload.password || payload.senha;
  if (!password || password.length < 6) {
    const error = new Error("A senha deve ter pelo menos 6 caracteres.");
    error.statusCode = 400;
    throw error;
  }

  return updateStore(async (data) => {
    const email = String(payload.email || "").toLowerCase();
    if (data.users.some((user) => user.email?.toLowerCase() === email)) {
      const error = new Error("E-mail ja cadastrado.");
      error.statusCode = 409;
      throw error;
    }

    const user = {
      id: randomUUID(),
      name: payload.responsibleName || payload.name || "Usuario",
      email,
      username: payload.username || email,
      passwordHash: await bcrypt.hash(password, 10),
      // Nunca aceite role enviado pelo cadastro publico. Isso evita que alguem
      // crie uma conta ADMIN apenas manipulando o payload no navegador.
      role: "USER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.users.push(user);

    return {
      user: publicUser(user),
      message: "Conta criada com sucesso."
    };
  });
}
