# FiscalVault

Projeto SaaS demonstrativo para armazenamento, organizacao e gestao de documentos fiscais como NF-e, CT-e, NFC-e e NFS-e.

## Stack

- Backend: Node.js, Express, CORS, dotenv, Prisma ORM preparado para PostgreSQL.
- Frontend: React, Vite, React Router, TailwindCSS, Axios.
- Banco: schema Prisma pronto para PostgreSQL, sem conexao obrigatoria neste momento.

## Como rodar localmente

### Pela raiz do projeto

```bash
cd C:\Users\paulo\Documents\GitHub\Safe_NFe
npm i
npm run dev
```

Esse comando sobe backend e frontend juntos.

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

### Rodar separado, se preferir

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

## Rotas da API

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/dashboard`
- `GET /api/invoices`
- `GET /api/invoices/:id`
- `POST /api/invoices/:id/manifest`
- `GET /api/ctes`
- `GET /api/companies`
- `POST /api/companies`
- `GET /api/reports`
- `GET /api/accountant/companies`
- `GET /api/settings`

## Banco de dados

Copie `backend/.env.example` para `backend/.env` quando quiser conectar um PostgreSQL real.

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

As telas e rotas usam dados mockados por enquanto, mantendo a arquitetura preparada para futuras integracoes com SEFAZ, certificados digitais, storage de XML/DANFE e ERPs.
