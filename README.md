# FiscalVault

Projeto SaaS para armazenamento, organizacao e gestao de documentos fiscais como NF-e, CT-e, NFC-e e NFS-e.

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

Login inicial:

```text
E-mail: admin@safe-nfe.local
Senha: 123456
```

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

## Fluxo para testar com empresa real

1. Acesse `http://localhost:5173`.
2. Entre com o login inicial.
3. Cadastre a empresa em `Empresas`, usando CNPJ com 14 digitos.
4. Acesse `Certificados` e envie um certificado A1 `.pfx` ou `.p12` da empresa.
5. Informe a senha do certificado e clique em `Validar`.
6. Clique em `Salvar` para vincular o certificado ao CNPJ da empresa.
7. Acesse `Captura`, escolha a empresa, fonte fiscal, UF, periodo, NSU/chave e tipo de documento.
8. Execute a busca. Os documentos capturados entram em `Documentos`.
9. Em `Documentos`, teste download individual/em lote de XML e PDF/DANFE.
10. Acesse `Auditoria` para consultar o historico de operacoes.

## Status das integracoes fiscais

O projeto agora possui fluxo completo de cofre fiscal local: empresas, certificados A1, documentos, captura parametrizada, DANFE simples, ZIP em lote e auditoria.

A consulta SEFAZ/NFS-e real ainda depende de um adaptador fiscal contratado/configurado. Para evitar falso positivo em producao, se `SEFAZ_INTEGRATION_ENABLED=true` ou `NFSE_INTEGRATION_ENABLED=true` forem usados sem endpoint/adaptador, a API retorna erro explicito.

Variaveis relevantes em `backend/.env`:

```env
SEFAZ_INTEGRATION_ENABLED=false
SEFAZ_DISTRIBUTION_URL=
NFSE_INTEGRATION_ENABLED=false
NFSE_PROVIDER_URL=
```

Com as flags desligadas, a captura roda em modo local de teste e grava documentos no cofre para validar o fluxo operacional.
