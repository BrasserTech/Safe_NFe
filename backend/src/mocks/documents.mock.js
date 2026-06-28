export const invoices = [
  {
    id: "nfe-001",
    number: "000.184.991",
    type: "NF-e",
    direction: "Entrada",
    issuer: "Metalurgica Solaris Ltda",
    cnpj: "21.443.998/0001-33",
    date: "2026-06-20",
    amount: 18450.9,
    status: "Autorizada",
    manifestStatus: "Pendente",
    company: "Alfa Comercio de Equipamentos Ltda"
  },
  {
    id: "nfe-002",
    number: "000.184.992",
    type: "NF-e",
    direction: "Saida",
    issuer: "Alfa Comercio de Equipamentos Ltda",
    cnpj: "12.345.678/0001-90",
    date: "2026-06-21",
    amount: 7290.5,
    status: "Autorizada",
    manifestStatus: "Confirmada",
    company: "Alfa Comercio de Equipamentos Ltda"
  },
  {
    id: "nfce-003",
    number: "000.009.332",
    type: "NFC-e",
    direction: "Saida",
    issuer: "Delta Alimentos Industriais Ltda",
    cnpj: "08.456.222/0001-47",
    date: "2026-06-22",
    amount: 985.7,
    status: "Autorizada",
    manifestStatus: "Nao aplicavel",
    company: "Delta Alimentos Industriais Ltda"
  },
  {
    id: "nfse-004",
    number: "2026/1568",
    type: "NFS-e",
    direction: "Entrada",
    issuer: "Studio Fiscal Digital",
    cnpj: "77.120.445/0001-81",
    date: "2026-06-24",
    amount: 3200,
    status: "Pendente",
    manifestStatus: "Pendente",
    company: "Brava Transportes Integrados S.A."
  },
  {
    id: "nfe-005",
    number: "000.185.010",
    type: "NF-e",
    direction: "Entrada",
    issuer: "Sul Pecas Automotivas",
    cnpj: "13.789.654/0001-02",
    date: "2026-06-25",
    amount: 43880.25,
    status: "Cancelada",
    manifestStatus: "Desconhecida",
    company: "Alfa Comercio de Equipamentos Ltda"
  }
];

export const ctes = [
  {
    id: "cte-001",
    number: "000.781.220",
    type: "CT-e",
    carrier: "Brava Transportes Integrados S.A.",
    cnpj: "45.987.321/0001-10",
    date: "2026-06-18",
    amount: 1490.75,
    status: "Autorizado",
    origin: "Joinville - SC",
    destination: "Curitiba - PR"
  },
  {
    id: "cte-002",
    number: "000.781.244",
    type: "CT-e",
    carrier: "Rota Azul Logistica",
    cnpj: "31.222.100/0001-14",
    date: "2026-06-22",
    amount: 980.2,
    status: "Autorizado",
    origin: "Florianopolis - SC",
    destination: "Porto Alegre - RS"
  },
  {
    id: "cte-003",
    number: "000.781.310",
    type: "CT-e",
    carrier: "ViaSul Cargas Ltda",
    cnpj: "18.502.220/0001-45",
    date: "2026-06-26",
    amount: 2210,
    status: "Pendente",
    origin: "Chapeco - SC",
    destination: "Sao Paulo - SP"
  }
];
