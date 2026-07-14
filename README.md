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

O projeto agora possui fluxo completo de cofre fiscal local: empresas, certificados A1, documentos, captura parametrizada, DANFE detalhada a partir do XML, ZIP em lote e auditoria.

A consulta SEFAZ/NFS-e real usa um adaptador HTTP configuravel. Com `SEFAZ_INTEGRATION_ENABLED=true` ou `NFSE_INTEGRATION_ENABLED=true`, a captura chama o endpoint contratado, envia empresa, certificado e parametros de consulta, normaliza os documentos retornados e salva XML/PDF no cofre.

Variaveis relevantes em `backend/.env`:

```env
SEFAZ_INTEGRATION_ENABLED=false
SEFAZ_DISTRIBUTION_URL=
SEFAZ_PROVIDER_TOKEN=
SEFAZ_PROVIDER_AUTH_HEADER=Authorization
SEFAZ_PROVIDER_TIMEOUT_MS=60000
SEFAZ_PROVIDER_SEND_CERTIFICATE=false

NFSE_INTEGRATION_ENABLED=false
NFSE_PROVIDER_URL=
NFSE_PROVIDER_TOKEN=
NFSE_PROVIDER_AUTH_HEADER=Authorization
NFSE_PROVIDER_TIMEOUT_MS=60000
NFSE_PROVIDER_SEND_CERTIFICATE=false
```

Com as flags desligadas, a captura roda em modo local de teste e grava documentos no cofre para validar o fluxo operacional.

### Contrato do provedor fiscal

O backend faz `POST` para `SEFAZ_DISTRIBUTION_URL` ou `NFSE_PROVIDER_URL` com JSON:

```json
{
  "company": {
    "id": "id-interno",
    "legalName": "Razao social",
    "cnpj": "00000000000000"
  },
  "certificate": {
    "id": "id-certificado",
    "type": "A1",
    "holder": "Titular",
    "document": "00000000000000",
    "expiresAt": "2026-12-31T00:00:00.000Z"
  },
  "query": {
    "documentType": "NF-e",
    "environment": "Producao",
    "direction": "Entrada",
    "role": "Destinatario",
    "ufCode": "42",
    "queryMode": "distNSU",
    "dateFrom": "2026-07-01",
    "dateTo": "2026-07-31",
    "nsu": "",
    "accessKey": ""
  }
}
```

Se `SEFAZ_PROVIDER_SEND_CERTIFICATE=true` ou `NFSE_PROVIDER_SEND_CERTIFICATE=true`, o objeto `certificate` tambem recebe `fileBase64` e `password`. Use essa opcao somente quando o provedor exigir o certificado a cada consulta.

Resposta aceita:

```json
{
  "provider": "nome-do-provedor",
  "status": "ok",
  "message": "Consulta concluida",
  "documents": [
    {
      "type": "NF-e",
      "direction": "Entrada",
      "issuer": "Fornecedor",
      "cnpj": "00000000000000",
      "number": "123",
      "accessKey": "chave-de-acesso",
      "nsu": "000000000000001",
      "date": "2026-07-14",
      "amount": 100.5,
      "status": "Autorizada",
      "manifestStatus": "Pendente",
      "xml": "<xml autorizado>"
    }
  ]
}
```
