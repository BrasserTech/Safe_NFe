import jwt from "jsonwebtoken";
import { readStore } from "../services/store.service.js";

const jwtSecret = process.env.JWT_SECRET || "safe-nfe-development-secret";

// Lê o token enviado pelo frontend no header Authorization.
// Formato esperado: Authorization: Bearer <token>.
function bearerToken(req) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  return type?.toLowerCase() === "bearer" ? token : "";
}

// Protege rotas da API. Sem token valido, o usuário nao consegue listar
// empresas, baixar XML, mexer em certificados ou executar captura fiscal.
export async function requireAuth(req, _res, next) {
  try {
    const token = bearerToken(req);
    if (!token) {
      const error = new Error("Autenticacao obrigatoria.");
      error.statusCode = 401;
      throw error;
    }

    const payload = jwt.verify(token, jwtSecret);
    const data = await readStore();
    const user = data.users.find((item) => item.id === payload.sub);

    if (!user) {
      const error = new Error("Usuario do token nao encontrado.");
      error.statusCode = 401;
      throw error;
    }

    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name
    };
    return next();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 401;
      error.message = "Token invalido ou expirado.";
    }
    return next(error);
  }
}

// Autoriza somente perfis especificos. Hoje usamos para manter cadastros e
// operacoes fiscais restritas a usuarios ADMIN.
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      const error = new Error("Usuario sem permissao para esta operacao.");
      error.statusCode = 403;
      return next(error);
    }

    return next();
  };
}
