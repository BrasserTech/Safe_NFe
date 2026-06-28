export function login({ email }) {
  return {
    token: "mocked-jwt-token",
    user: {
      id: "usr-001",
      name: "Paulo Fiscal",
      email,
      company: "Alfa Comercio de Equipamentos Ltda"
    }
  };
}

export function register(payload) {
  return {
    id: "usr-new",
    companyName: payload.companyName,
    responsibleName: payload.responsibleName,
    email: payload.email,
    message: "Conta criada com sucesso em ambiente mockado."
  };
}
