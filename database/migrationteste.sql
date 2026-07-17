-- Safe NFe - schema de teste reconstruido do zero
-- Banco-alvo: PostgreSQL 14+
-- Objetivo: cofre fiscal multiempresa para NF-e, NFC-e, CT-e, MDF-e e NFS-e.
--
-- PRINCIPIOS
-- 1. O XML autorizado original e a fonte de verdade e nunca deve ser alterado.
-- 2. Campos pesquisaveis ficam normalizados; detalhes raros permanecem em JSONB/XML.
-- 3. Todas as tabelas possuem chave, ativo, identificador e datahoraalt.
-- 4. Nao ha triggers ou procedures. A aplicacao atualiza datahoraalt, auditoria,
--    inativacoes, filas, NSU e demais regras transacionais.
-- 5. Nenhum documento fiscal e apagado fisicamente pelo fluxo normal da aplicacao.
-- 6. Valores monetarios usam NUMERIC; datas fiscais usam TIMESTAMPTZ.

BEGIN;

-- ---------------------------------------------------------------------------
-- CONFIGURACAO, CONTAS, ACESSO E MULTIEMPRESA
-- ---------------------------------------------------------------------------

CREATE TABLE configuracoes_sistema (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nome_sistema VARCHAR(120) NOT NULL DEFAULT 'Safe NFe',
    ambiente_padrao SMALLINT NOT NULL DEFAULT 2,
    dias_retencao_documentos INTEGER,
    tamanho_maximo_upload_bytes BIGINT NOT NULL DEFAULT 10485760,
    quantidade_maxima_zip INTEGER NOT NULL DEFAULT 500,
    storage_padrao VARCHAR(20) NOT NULL DEFAULT 'banco',
    parametros JSONB NOT NULL DEFAULT '{}'::JSONB,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT configuracoes_sistema_identificador_uq UNIQUE (identificador),
    CONSTRAINT configuracoes_sistema_ambiente_ck CHECK (ambiente_padrao IN (1, 2)),
    CONSTRAINT configuracoes_sistema_storage_ck CHECK (storage_padrao IN ('banco', 'local', 's3')),
    CONSTRAINT configuracoes_sistema_upload_ck CHECK (tamanho_maximo_upload_bytes > 0),
    CONSTRAINT configuracoes_sistema_zip_ck CHECK (quantidade_maxima_zip > 0)
);

-- Senha em texto simples somente durante a fase solicitada de prototipo.
-- Antes de qualquer publicacao, trocar senha por senha_hash (Argon2id/bcrypt),
-- invalidar todas as senhas existentes e nunca selecionar esse campo em APIs.
CREATE TABLE usuarios (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL,
    login VARCHAR(100) NOT NULL,
    senha TEXT NOT NULL,
    perfil_global VARCHAR(20) NOT NULL DEFAULT 'usuario',
    telefone VARCHAR(30),
    idioma VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    fuso_horario VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo',
    ultimo_login_em TIMESTAMPTZ,
    tentativas_login INTEGER NOT NULL DEFAULT 0,
    bloqueado_ate TIMESTAMPTZ,
    trocar_senha BOOLEAN NOT NULL DEFAULT FALSE,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_identificador_uq UNIQUE (identificador),
    CONSTRAINT usuarios_perfil_ck CHECK (perfil_global IN ('superadmin', 'admin', 'usuario', 'suporte')),
    CONSTRAINT usuarios_tentativas_ck CHECK (tentativas_login >= 0)
);

CREATE UNIQUE INDEX usuarios_email_uq ON usuarios (LOWER(email));
CREATE UNIQUE INDEX usuarios_login_uq ON usuarios (LOWER(login));

-- Cliente e o tenant/assinante; pode ser empresa ou escritorio contabil.
CREATE TABLE clientes (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo VARCHAR(20) NOT NULL DEFAULT 'empresa',
    nome VARCHAR(180) NOT NULL,
    cpf_cnpj VARCHAR(14),
    email VARCHAR(254),
    telefone VARCHAR(30),
    plano VARCHAR(50),
    limite_empresas INTEGER,
    limite_armazenamento_bytes BIGINT,
    armazenamento_utilizado_bytes BIGINT NOT NULL DEFAULT 0,
    vencimento_assinatura DATE,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT clientes_identificador_uq UNIQUE (identificador),
    CONSTRAINT clientes_cpf_cnpj_uq UNIQUE (cpf_cnpj),
    CONSTRAINT clientes_tipo_ck CHECK (tipo IN ('empresa', 'contabilidade', 'interno')),
    CONSTRAINT clientes_documento_ck CHECK (cpf_cnpj IS NULL OR cpf_cnpj ~ '^([0-9]{11}|[0-9]{14})$'),
    CONSTRAINT clientes_armazenamento_ck CHECK (armazenamento_utilizado_bytes >= 0)
);

CREATE TABLE clientes_usuarios (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cliente_chave BIGINT NOT NULL,
    usuario_chave BIGINT NOT NULL,
    perfil VARCHAR(20) NOT NULL DEFAULT 'consulta',
    pode_gerenciar_usuarios BOOLEAN NOT NULL DEFAULT FALSE,
    pode_gerenciar_empresas BOOLEAN NOT NULL DEFAULT FALSE,
    pode_gerenciar_certificados BOOLEAN NOT NULL DEFAULT FALSE,
    pode_consultar BOOLEAN NOT NULL DEFAULT TRUE,
    pode_baixar BOOLEAN NOT NULL DEFAULT TRUE,
    pode_manifestar BOOLEAN NOT NULL DEFAULT FALSE,
    pode_exportar BOOLEAN NOT NULL DEFAULT FALSE,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT clientes_usuarios_identificador_uq UNIQUE (identificador),
    CONSTRAINT clientes_usuarios_vinculo_uq UNIQUE (cliente_chave, usuario_chave),
    CONSTRAINT clientes_usuarios_cliente_fk FOREIGN KEY (cliente_chave) REFERENCES clientes (chave),
    CONSTRAINT clientes_usuarios_usuario_fk FOREIGN KEY (usuario_chave) REFERENCES usuarios (chave),
    CONSTRAINT clientes_usuarios_perfil_ck CHECK (perfil IN ('admin', 'operador', 'contador', 'consulta'))
);

CREATE TABLE empresas (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cliente_chave BIGINT NOT NULL,
    tipo_pessoa SMALLINT NOT NULL DEFAULT 2,
    cpf_cnpj VARCHAR(14) NOT NULL,
    razao_social VARCHAR(180) NOT NULL,
    nome_fantasia VARCHAR(180),
    inscricao_estadual VARCHAR(30),
    inscricao_municipal VARCHAR(30),
    suframa VARCHAR(20),
    regime_tributario SMALLINT,
    regime_pis_cofins SMALLINT,
    perfil_sped CHAR(1),
    cnae_principal VARCHAR(7),
    cnaes_secundarios JSONB NOT NULL DEFAULT '[]'::JSONB,
    email VARCHAR(254),
    email_fiscal VARCHAR(254),
    telefone VARCHAR(30),
    representante_legal VARCHAR(180),
    cpf_representante VARCHAR(11),
    contador_nome VARCHAR(180),
    contador_cpf_cnpj VARCHAR(14),
    contador_crc VARCHAR(30),
    contador_email VARCHAR(254),
    logradouro VARCHAR(180),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    codigo_municipio VARCHAR(7),
    municipio VARCHAR(120),
    uf CHAR(2),
    cep VARCHAR(8),
    codigo_pais VARCHAR(4) NOT NULL DEFAULT '1058',
    pais VARCHAR(80) NOT NULL DEFAULT 'Brasil',
    monitorar_nfe BOOLEAN NOT NULL DEFAULT TRUE,
    monitorar_cte BOOLEAN NOT NULL DEFAULT TRUE,
    monitorar_nfse BOOLEAN NOT NULL DEFAULT FALSE,
    monitorar_mdfe BOOLEAN NOT NULL DEFAULT FALSE,
    manifestacao_automatica VARCHAR(30) NOT NULL DEFAULT 'desativada',
    status_fiscal VARCHAR(30) NOT NULL DEFAULT 'pendente_certificado',
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT empresas_identificador_uq UNIQUE (identificador),
    CONSTRAINT empresas_cpf_cnpj_uq UNIQUE (cpf_cnpj),
    CONSTRAINT empresas_cliente_fk FOREIGN KEY (cliente_chave) REFERENCES clientes (chave),
    CONSTRAINT empresas_tipo_pessoa_ck CHECK (tipo_pessoa IN (1, 2)),
    CONSTRAINT empresas_documento_ck CHECK (cpf_cnpj ~ '^([0-9]{11}|[0-9]{14})$'),
    CONSTRAINT empresas_uf_ck CHECK (uf IS NULL OR uf ~ '^[A-Z]{2}$'),
    CONSTRAINT empresas_manifestacao_ck CHECK (manifestacao_automatica IN ('desativada', 'ciencia', 'confirmacao')),
    CONSTRAINT empresas_status_ck CHECK (status_fiscal IN ('ativa', 'inativa', 'pendente_certificado', 'certificado_vencido', 'erro'))
);

-- Restringe usuarios a empresas especificas. Sem linhas ativas, um admin do
-- cliente pode receber acesso a todas conforme regra da aplicacao.
CREATE TABLE empresas_usuarios (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    empresa_chave BIGINT NOT NULL,
    usuario_chave BIGINT NOT NULL,
    pode_consultar BOOLEAN NOT NULL DEFAULT TRUE,
    pode_baixar BOOLEAN NOT NULL DEFAULT TRUE,
    pode_manifestar BOOLEAN NOT NULL DEFAULT FALSE,
    pode_alterar BOOLEAN NOT NULL DEFAULT FALSE,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT empresas_usuarios_identificador_uq UNIQUE (identificador),
    CONSTRAINT empresas_usuarios_vinculo_uq UNIQUE (empresa_chave, usuario_chave),
    CONSTRAINT empresas_usuarios_empresa_fk FOREIGN KEY (empresa_chave) REFERENCES empresas (chave),
    CONSTRAINT empresas_usuarios_usuario_fk FOREIGN KEY (usuario_chave) REFERENCES usuarios (chave)
);

CREATE TABLE certificados_digitais (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    empresa_chave BIGINT NOT NULL,
    tipo VARCHAR(10) NOT NULL DEFAULT 'A1',
    titular VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(14) NOT NULL,
    numero_serie VARCHAR(180),
    emissor VARCHAR(255),
    valido_de TIMESTAMPTZ,
    valido_ate TIMESTAMPTZ NOT NULL,
    impressao_digital_sha256 CHAR(64),
    storage_chave VARCHAR(500) NOT NULL,
    senha_criptografada TEXT NOT NULL,
    algoritmo_criptografia VARCHAR(30) NOT NULL DEFAULT 'aes-256-gcm',
    status VARCHAR(30) NOT NULL DEFAULT 'valido',
    ultimo_teste_em TIMESTAMPTZ,
    mensagem_ultimo_teste TEXT,
    usuario_cadastro_chave BIGINT,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT certificados_identificador_uq UNIQUE (identificador),
    CONSTRAINT certificados_impressao_uq UNIQUE (impressao_digital_sha256),
    CONSTRAINT certificados_empresa_fk FOREIGN KEY (empresa_chave) REFERENCES empresas (chave),
    CONSTRAINT certificados_usuario_fk FOREIGN KEY (usuario_cadastro_chave) REFERENCES usuarios (chave),
    CONSTRAINT certificados_tipo_ck CHECK (tipo IN ('A1', 'A3')),
    CONSTRAINT certificados_status_ck CHECK (status IN ('valido', 'vencido', 'revogado', 'invalido', 'pendente'))
);

-- ---------------------------------------------------------------------------
-- INTEGRACOES, CAPTURA, NSU E IMPORTACAO
-- ---------------------------------------------------------------------------

CREATE TABLE integracoes (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cliente_chave BIGINT,
    empresa_chave BIGINT,
    tipo VARCHAR(30) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    endpoint TEXT,
    autenticacao_criptografada TEXT,
    configuracao JSONB NOT NULL DEFAULT '{}'::JSONB,
    timeout_ms INTEGER NOT NULL DEFAULT 60000,
    tentativas_maximas INTEGER NOT NULL DEFAULT 3,
    ultimo_sucesso_em TIMESTAMPTZ,
    ultimo_erro_em TIMESTAMPTZ,
    mensagem_ultimo_erro TEXT,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT integracoes_identificador_uq UNIQUE (identificador),
    CONSTRAINT integracoes_cliente_fk FOREIGN KEY (cliente_chave) REFERENCES clientes (chave),
    CONSTRAINT integracoes_empresa_fk FOREIGN KEY (empresa_chave) REFERENCES empresas (chave),
    CONSTRAINT integracoes_tipo_ck CHECK (tipo IN ('sefaz', 'nfse', 'email', 'api', 'erp', 'storage')),
    CONSTRAINT integracoes_timeout_ck CHECK (timeout_ms > 0),
    CONSTRAINT integracoes_tentativas_ck CHECK (tentativas_maximas >= 0)
);

-- Estado do servico de distribuicao por empresa, documento e ambiente.
CREATE TABLE distribuicao_dfe_controle (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    empresa_chave BIGINT NOT NULL,
    tipo_documento VARCHAR(10) NOT NULL,
    ambiente SMALLINT NOT NULL DEFAULT 1,
    ultimo_nsu VARCHAR(30) NOT NULL DEFAULT '0',
    max_nsu VARCHAR(30) NOT NULL DEFAULT '0',
    data_ultima_consulta TIMESTAMPTZ,
    proxima_consulta_em TIMESTAMPTZ,
    bloqueado_ate TIMESTAMPTZ,
    codigo_ultimo_retorno VARCHAR(10),
    mensagem_ultimo_retorno TEXT,
    falhas_consecutivas INTEGER NOT NULL DEFAULT 0,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT distribuicao_identificador_uq UNIQUE (identificador),
    CONSTRAINT distribuicao_empresa_tipo_ambiente_uq UNIQUE (empresa_chave, tipo_documento, ambiente),
    CONSTRAINT distribuicao_empresa_fk FOREIGN KEY (empresa_chave) REFERENCES empresas (chave),
    CONSTRAINT distribuicao_tipo_ck CHECK (tipo_documento IN ('NFE', 'CTE', 'NFSE', 'MDFE')),
    CONSTRAINT distribuicao_ambiente_ck CHECK (ambiente IN (1, 2)),
    CONSTRAINT distribuicao_falhas_ck CHECK (falhas_consecutivas >= 0)
);

-- Uma execucao pode vir do agendador, tela, upload, e-mail ou API.
CREATE TABLE consultas_fiscais (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    empresa_chave BIGINT NOT NULL,
    certificado_chave BIGINT,
    integracao_chave BIGINT,
    usuario_chave BIGINT,
    origem VARCHAR(20) NOT NULL,
    tipo_documento VARCHAR(10),
    ambiente SMALLINT NOT NULL DEFAULT 1,
    modo_consulta VARCHAR(30) NOT NULL,
    chave_acesso VARCHAR(44),
    nsu_inicial VARCHAR(30),
    ultimo_nsu VARCHAR(30),
    max_nsu VARCHAR(30),
    data_inicial DATE,
    data_final DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    prioridade SMALLINT NOT NULL DEFAULT 5,
    tentativa INTEGER NOT NULL DEFAULT 0,
    codigo_retorno VARCHAR(20),
    mensagem_retorno TEXT,
    quantidade_localizada INTEGER NOT NULL DEFAULT 0,
    quantidade_nova INTEGER NOT NULL DEFAULT 0,
    quantidade_duplicada INTEGER NOT NULL DEFAULT 0,
    quantidade_erro INTEGER NOT NULL DEFAULT 0,
    requisicao JSONB,
    resposta_resumo JSONB,
    iniciada_em TIMESTAMPTZ,
    finalizada_em TIMESTAMPTZ,
    proxima_tentativa_em TIMESTAMPTZ,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT consultas_identificador_uq UNIQUE (identificador),
    CONSTRAINT consultas_empresa_fk FOREIGN KEY (empresa_chave) REFERENCES empresas (chave),
    CONSTRAINT consultas_certificado_fk FOREIGN KEY (certificado_chave) REFERENCES certificados_digitais (chave),
    CONSTRAINT consultas_integracao_fk FOREIGN KEY (integracao_chave) REFERENCES integracoes (chave),
    CONSTRAINT consultas_usuario_fk FOREIGN KEY (usuario_chave) REFERENCES usuarios (chave),
    CONSTRAINT consultas_origem_ck CHECK (origem IN ('agendador', 'manual', 'upload', 'email', 'api', 'erp')),
    CONSTRAINT consultas_tipo_ck CHECK (tipo_documento IS NULL OR tipo_documento IN ('NFE', 'NFCE', 'CTE', 'MDFE', 'NFSE')),
    CONSTRAINT consultas_ambiente_ck CHECK (ambiente IN (1, 2)),
    CONSTRAINT consultas_status_ck CHECK (status IN ('pendente', 'processando', 'concluida', 'parcial', 'erro', 'cancelada')),
    CONSTRAINT consultas_contadores_ck CHECK (
        tentativa >= 0 AND quantidade_localizada >= 0 AND quantidade_nova >= 0
        AND quantidade_duplicada >= 0 AND quantidade_erro >= 0
    )
);

CREATE TABLE consultas_fiscais_erros (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    consulta_fiscal_chave BIGINT NOT NULL,
    etapa VARCHAR(50) NOT NULL,
    codigo VARCHAR(50),
    mensagem TEXT NOT NULL,
    detalhe TEXT,
    payload JSONB,
    recuperavel BOOLEAN NOT NULL DEFAULT TRUE,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT consultas_erros_identificador_uq UNIQUE (identificador),
    CONSTRAINT consultas_erros_consulta_fk FOREIGN KEY (consulta_fiscal_chave) REFERENCES consultas_fiscais (chave)
);

-- ---------------------------------------------------------------------------
-- PARTICIPANTES E DOCUMENTO FISCAL
-- ---------------------------------------------------------------------------

CREATE TABLE participantes_fiscais (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo_pessoa SMALLINT,
    cpf_cnpj VARCHAR(14),
    id_estrangeiro VARCHAR(30),
    nome_razao_social VARCHAR(180) NOT NULL,
    nome_fantasia VARCHAR(180),
    inscricao_estadual VARCHAR(30),
    indicador_ie SMALLINT,
    inscricao_municipal VARCHAR(30),
    suframa VARCHAR(20),
    regime_tributario SMALLINT,
    email VARCHAR(254),
    telefone VARCHAR(30),
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT participantes_identificador_uq UNIQUE (identificador),
    CONSTRAINT participantes_documento_ck CHECK (cpf_cnpj IS NULL OR cpf_cnpj ~ '^([0-9]{11}|[0-9]{14})$'),
    CONSTRAINT participantes_tipo_pessoa_ck CHECK (tipo_pessoa IS NULL OR tipo_pessoa IN (1, 2))
);

CREATE UNIQUE INDEX participantes_cpf_cnpj_uq
    ON participantes_fiscais (cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;

CREATE TABLE participantes_enderecos (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    participante_chave BIGINT NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'fiscal',
    logradouro VARCHAR(180),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    codigo_municipio VARCHAR(7),
    municipio VARCHAR(120),
    uf CHAR(2),
    cep VARCHAR(8),
    codigo_pais VARCHAR(4),
    pais VARCHAR(80),
    telefone VARCHAR(30),
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT participantes_enderecos_identificador_uq UNIQUE (identificador),
    CONSTRAINT participantes_enderecos_participante_fk FOREIGN KEY (participante_chave) REFERENCES participantes_fiscais (chave),
    CONSTRAINT participantes_enderecos_tipo_ck CHECK (tipo IN ('fiscal', 'entrega', 'retirada', 'cobranca', 'outro'))
);

-- Cabecalho unificado. Campos exclusivos/raros continuam em dados_adicionais,
-- garantindo compatibilidade com novas Notas Tecnicas sem migration imediato.
CREATE TABLE documentos_fiscais (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    empresa_chave BIGINT NOT NULL,
    consulta_fiscal_chave BIGINT,
    tipo_documento VARCHAR(10) NOT NULL,
    modelo VARCHAR(4),
    serie VARCHAR(10),
    subserie VARCHAR(10),
    numero VARCHAR(30),
    chave_acesso VARCHAR(60),
    codigo_numerico VARCHAR(20),
    nsu VARCHAR(30),
    numero_recibo VARCHAR(50),
    protocolo_autorizacao VARCHAR(80),
    ambiente SMALLINT NOT NULL DEFAULT 1,
    versao_leiaute VARCHAR(10),
    tipo_emissao SMALLINT,
    finalidade SMALLINT,
    processo_emissao SMALLINT,
    versao_aplicativo VARCHAR(30),
    natureza_operacao VARCHAR(180),
    direcao VARCHAR(10) NOT NULL,
    data_emissao TIMESTAMPTZ,
    data_saida_entrada TIMESTAMPTZ,
    data_autorizacao TIMESTAMPTZ,
    competencia DATE,
    data_cancelamento TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    codigo_status VARCHAR(10),
    motivo_status TEXT,
    manifestacao_status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    manifestacao_data TIMESTAMPTZ,
    consumidor_final BOOLEAN,
    presenca_comprador SMALLINT,
    intermediador BOOLEAN,
    indicador_pagamento SMALLINT,
    municipio_fato_gerador VARCHAR(7),
    uf_embarque CHAR(2),
    local_embarque VARCHAR(120),
    valor_base_icms NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_icms NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_icms_desonerado NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_fcp NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_base_icms_st NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_icms_st NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_fcp_st NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_fcp_st_retido NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_produtos NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_servicos NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_frete NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_seguro NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_desconto NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_imposto_importacao NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_ipi NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_ipi_devolvido NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_pis NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_cofins NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_outras_despesas NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_total_tributos NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_iss NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_retencoes NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_base_ibs_cbs NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_ibs_uf NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_ibs_municipio NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_cbs NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_credito_presumido_ibs NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_credito_presumido_cbs NUMERIC(18, 2) NOT NULL DEFAULT 0,
    informacoes_fisco TEXT,
    informacoes_complementares TEXT,
    qr_code TEXT,
    url_consulta TEXT,
    origem_captura VARCHAR(20) NOT NULL,
    validado_schema BOOLEAN NOT NULL DEFAULT FALSE,
    validado_assinatura BOOLEAN NOT NULL DEFAULT FALSE,
    duplicado BOOLEAN NOT NULL DEFAULT FALSE,
    documento_substituido_chave BIGINT,
    dados_adicionais JSONB NOT NULL DEFAULT '{}'::JSONB,
    data_captura TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_empresa_fk FOREIGN KEY (empresa_chave) REFERENCES empresas (chave),
    CONSTRAINT documentos_consulta_fk FOREIGN KEY (consulta_fiscal_chave) REFERENCES consultas_fiscais (chave),
    CONSTRAINT documentos_substituido_fk FOREIGN KEY (documento_substituido_chave) REFERENCES documentos_fiscais (chave),
    CONSTRAINT documentos_tipo_ck CHECK (tipo_documento IN ('NFE', 'NFCE', 'CTE', 'MDFE', 'NFSE')),
    CONSTRAINT documentos_direcao_ck CHECK (direcao IN ('entrada', 'saida', 'terceiro')),
    CONSTRAINT documentos_ambiente_ck CHECK (ambiente IN (1, 2)),
    CONSTRAINT documentos_status_ck CHECK (status IN ('resumo', 'autorizado', 'cancelado', 'denegado', 'inutilizado', 'rejeitado', 'pendente', 'substituido')),
    CONSTRAINT documentos_manifestacao_ck CHECK (manifestacao_status IN ('pendente', 'ciencia', 'confirmada', 'desconhecida', 'nao_realizada')),
    CONSTRAINT documentos_origem_ck CHECK (origem_captura IN ('sefaz', 'nfse', 'upload', 'email', 'api', 'erp')),
    CONSTRAINT documentos_chave_ck CHECK (chave_acesso IS NULL OR chave_acesso ~ '^[0-9]{44,60}$')
);

-- Uma empresa nunca deve ter duas copias logicas da mesma chave fiscal.
CREATE UNIQUE INDEX documentos_empresa_tipo_chave_uq
    ON documentos_fiscais (empresa_chave, tipo_documento, chave_acesso)
    WHERE chave_acesso IS NOT NULL AND duplicado = FALSE;

-- Papeis permitem remetente/destinatario/tomador/expedidor/recebedor sem
-- adicionar uma FK nova ao cabecalho para cada tipo de DFe.
CREATE TABLE documentos_participantes (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    participante_chave BIGINT NOT NULL,
    endereco_chave BIGINT,
    papel VARCHAR(30) NOT NULL,
    ordem SMALLINT NOT NULL DEFAULT 1,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_participantes_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_participantes_papel_uq UNIQUE (documento_fiscal_chave, papel, ordem),
    CONSTRAINT documentos_participantes_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave),
    CONSTRAINT documentos_participantes_participante_fk FOREIGN KEY (participante_chave) REFERENCES participantes_fiscais (chave),
    CONSTRAINT documentos_participantes_endereco_fk FOREIGN KEY (endereco_chave) REFERENCES participantes_enderecos (chave),
    CONSTRAINT documentos_participantes_papel_ck CHECK (papel IN ('emitente', 'destinatario', 'remetente', 'expedidor', 'recebedor', 'tomador', 'transportador', 'entrega', 'retirada', 'intermediador')),
    CONSTRAINT documentos_participantes_ordem_ck CHECK (ordem > 0)
);

-- XML autorizado deve existir como artefato. PDF/DANFE/DACTE sao derivados.
-- conteudo e storage_chave sao mutuamente alternativos, mas ao menos um existe.
CREATE TABLE documentos_arquivos (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    original BOOLEAN NOT NULL DEFAULT FALSE,
    nome_arquivo VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    encoding VARCHAR(20),
    compactado BOOLEAN NOT NULL DEFAULT FALSE,
    tamanho_original_bytes BIGINT NOT NULL,
    tamanho_armazenado_bytes BIGINT NOT NULL,
    hash_sha256 CHAR(64) NOT NULL,
    storage_provider VARCHAR(20) NOT NULL DEFAULT 'banco',
    storage_chave VARCHAR(1000),
    conteudo BYTEA,
    versao SMALLINT NOT NULL DEFAULT 1,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_arquivos_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_arquivos_versao_uq UNIQUE (documento_fiscal_chave, tipo, versao),
    CONSTRAINT documentos_arquivos_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave),
    CONSTRAINT documentos_arquivos_tipo_ck CHECK (tipo IN ('xml', 'xml_evento', 'pdf', 'danfe', 'dacte', 'damdfe', 'danfse', 'outro')),
    CONSTRAINT documentos_arquivos_provider_ck CHECK (storage_provider IN ('banco', 'local', 's3')),
    CONSTRAINT documentos_arquivos_conteudo_ck CHECK (
        (storage_provider = 'banco' AND conteudo IS NOT NULL)
        OR (storage_provider IN ('local', 's3') AND storage_chave IS NOT NULL)
    ),
    CONSTRAINT documentos_arquivos_tamanho_ck CHECK (tamanho_original_bytes >= 0 AND tamanho_armazenado_bytes >= 0),
    CONSTRAINT documentos_arquivos_versao_ck CHECK (versao > 0)
);

CREATE TABLE documentos_itens (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    numero_item INTEGER NOT NULL,
    codigo_produto VARCHAR(80),
    ean VARCHAR(20),
    ean_tributavel VARCHAR(20),
    descricao VARCHAR(255) NOT NULL,
    ncm VARCHAR(8),
    cest VARCHAR(7),
    ex_tipi VARCHAR(3),
    cfop VARCHAR(4),
    codigo_beneficio_fiscal VARCHAR(20),
    unidade_comercial VARCHAR(10),
    quantidade_comercial NUMERIC(18, 6) NOT NULL DEFAULT 0,
    valor_unitario_comercial NUMERIC(18, 10) NOT NULL DEFAULT 0,
    unidade_tributavel VARCHAR(10),
    quantidade_tributavel NUMERIC(18, 6) NOT NULL DEFAULT 0,
    valor_unitario_tributavel NUMERIC(18, 10) NOT NULL DEFAULT 0,
    valor_bruto NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_frete NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_seguro NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_desconto NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_outras_despesas NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
    compoe_total BOOLEAN NOT NULL DEFAULT TRUE,
    numero_pedido VARCHAR(30),
    item_pedido VARCHAR(10),
    numero_fci VARCHAR(36),
    informacoes_adicionais TEXT,
    dados_adicionais JSONB NOT NULL DEFAULT '{}'::JSONB,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_itens_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_itens_numero_uq UNIQUE (documento_fiscal_chave, numero_item),
    CONSTRAINT documentos_itens_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave),
    CONSTRAINT documentos_itens_numero_ck CHECK (numero_item > 0)
);

-- Uma linha para cada grupo tributario do item. O campo dados_adicionais
-- preserva campos especificos de CST/CSOSN e futuras Notas Tecnicas.
CREATE TABLE documentos_itens_tributos (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_item_chave BIGINT NOT NULL,
    tributo VARCHAR(20) NOT NULL,
    origem_mercadoria SMALLINT,
    cst VARCHAR(5),
    csosn VARCHAR(5),
    classificacao_tributaria VARCHAR(20),
    modalidade_base_calculo SMALLINT,
    percentual_reducao NUMERIC(12, 6) NOT NULL DEFAULT 0,
    base_calculo NUMERIC(18, 2) NOT NULL DEFAULT 0,
    aliquota NUMERIC(12, 6) NOT NULL DEFAULT 0,
    quantidade_base NUMERIC(18, 6),
    valor_por_unidade NUMERIC(18, 10),
    percentual_mva NUMERIC(12, 6) NOT NULL DEFAULT 0,
    percentual_diferimento NUMERIC(12, 6) NOT NULL DEFAULT 0,
    valor_diferido NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_desonerado NUMERIC(18, 2) NOT NULL DEFAULT 0,
    motivo_desoneracao SMALLINT,
    valor_tributo NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_credito NUMERIC(18, 2) NOT NULL DEFAULT 0,
    dados_adicionais JSONB NOT NULL DEFAULT '{}'::JSONB,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT itens_tributos_identificador_uq UNIQUE (identificador),
    CONSTRAINT itens_tributos_tipo_uq UNIQUE (documento_item_chave, tributo),
    CONSTRAINT itens_tributos_item_fk FOREIGN KEY (documento_item_chave) REFERENCES documentos_itens (chave),
    CONSTRAINT itens_tributos_tipo_ck CHECK (tributo IN ('ICMS', 'ICMS_ST', 'FCP', 'FCP_ST', 'IPI', 'II', 'PIS', 'COFINS', 'ISSQN', 'IBS_UF', 'IBS_MUN', 'CBS', 'IS', 'OUTRO'))
);

CREATE TABLE documentos_pagamentos (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    ordem SMALLINT NOT NULL DEFAULT 1,
    indicador_pagamento SMALLINT,
    meio_pagamento VARCHAR(5),
    descricao_meio VARCHAR(100),
    valor NUMERIC(18, 2) NOT NULL DEFAULT 0,
    troco NUMERIC(18, 2) NOT NULL DEFAULT 0,
    cnpj_credenciadora VARCHAR(14),
    bandeira_cartao VARCHAR(5),
    autorizacao_cartao VARCHAR(30),
    tipo_integracao SMALLINT,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_pagamentos_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_pagamentos_ordem_uq UNIQUE (documento_fiscal_chave, ordem),
    CONSTRAINT documentos_pagamentos_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave),
    CONSTRAINT documentos_pagamentos_ordem_ck CHECK (ordem > 0)
);

CREATE TABLE documentos_parcelas (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    numero VARCHAR(30) NOT NULL,
    vencimento DATE,
    valor NUMERIC(18, 2) NOT NULL DEFAULT 0,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_parcelas_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_parcelas_numero_uq UNIQUE (documento_fiscal_chave, numero),
    CONSTRAINT documentos_parcelas_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave)
);

CREATE TABLE documentos_transporte (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    modalidade_frete SMALLINT,
    placa VARCHAR(10),
    uf_veiculo CHAR(2),
    rntc VARCHAR(20),
    vagao VARCHAR(20),
    balsa VARCHAR(20),
    quantidade_volumes NUMERIC(18, 3),
    especie VARCHAR(60),
    marca VARCHAR(60),
    numeracao VARCHAR(60),
    lacres JSONB NOT NULL DEFAULT '[]'::JSONB,
    peso_liquido NUMERIC(18, 3),
    peso_bruto NUMERIC(18, 3),
    dados_adicionais JSONB NOT NULL DEFAULT '{}'::JSONB,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_transporte_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_transporte_documento_uq UNIQUE (documento_fiscal_chave),
    CONSTRAINT documentos_transporte_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave)
);

-- Vinculos com notas referenciadas, CT-e, MDF-e, pedidos e documentos anteriores.
CREATE TABLE documentos_referencias (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    tipo_referencia VARCHAR(20) NOT NULL,
    documento_referenciado_chave BIGINT,
    chave_acesso VARCHAR(60),
    codigo_uf CHAR(2),
    ano_mes CHAR(4),
    cpf_cnpj VARCHAR(14),
    modelo VARCHAR(4),
    serie VARCHAR(10),
    numero VARCHAR(30),
    dados_adicionais JSONB NOT NULL DEFAULT '{}'::JSONB,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_referencias_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_referencias_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave),
    CONSTRAINT documentos_referencias_referenciado_fk FOREIGN KEY (documento_referenciado_chave) REFERENCES documentos_fiscais (chave),
    CONSTRAINT documentos_referencias_tipo_ck CHECK (tipo_referencia IN ('NFE', 'NFCE', 'CTE', 'MDFE', 'NFSE', 'NF_MODELO_1', 'PRODUTOR', 'ECF', 'PEDIDO', 'OUTRO'))
);

-- ---------------------------------------------------------------------------
-- DETALHES DE CT-E/MDF-E/NFS-E E EVENTOS
-- ---------------------------------------------------------------------------

CREATE TABLE ctes_detalhes (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    tipo_cte SMALLINT,
    tipo_servico SMALLINT,
    tomador_servico SMALLINT,
    modal SMALLINT,
    codigo_municipio_inicio VARCHAR(7),
    uf_inicio CHAR(2),
    codigo_municipio_fim VARCHAR(7),
    uf_fim CHAR(2),
    produto_predominante VARCHAR(120),
    outras_caracteristicas_carga VARCHAR(120),
    valor_carga NUMERIC(18, 2) NOT NULL DEFAULT 0,
    quantidade_carga NUMERIC(18, 4),
    unidade_carga SMALLINT,
    peso_bruto NUMERIC(18, 3),
    cubagem NUMERIC(18, 4),
    ciot VARCHAR(20),
    rntrc VARCHAR(20),
    valor_frete_peso NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_frete_valor NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_gris NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_pedagio NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_despacho NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_outros NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_receber NUMERIC(18, 2) NOT NULL DEFAULT 0,
    dados_modal JSONB NOT NULL DEFAULT '{}'::JSONB,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ctes_detalhes_identificador_uq UNIQUE (identificador),
    CONSTRAINT ctes_detalhes_documento_uq UNIQUE (documento_fiscal_chave),
    CONSTRAINT ctes_detalhes_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave)
);

CREATE TABLE ctes_componentes_valor (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cte_detalhe_chave BIGINT NOT NULL,
    nome VARCHAR(60) NOT NULL,
    valor NUMERIC(18, 2) NOT NULL DEFAULT 0,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ctes_componentes_identificador_uq UNIQUE (identificador),
    CONSTRAINT ctes_componentes_nome_uq UNIQUE (cte_detalhe_chave, nome),
    CONSTRAINT ctes_componentes_cte_fk FOREIGN KEY (cte_detalhe_chave) REFERENCES ctes_detalhes (chave)
);

CREATE TABLE ctes_percurso (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cte_detalhe_chave BIGINT NOT NULL,
    ordem SMALLINT NOT NULL,
    uf CHAR(2) NOT NULL,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ctes_percurso_identificador_uq UNIQUE (identificador),
    CONSTRAINT ctes_percurso_ordem_uq UNIQUE (cte_detalhe_chave, ordem),
    CONSTRAINT ctes_percurso_cte_fk FOREIGN KEY (cte_detalhe_chave) REFERENCES ctes_detalhes (chave),
    CONSTRAINT ctes_percurso_ordem_ck CHECK (ordem > 0)
);

CREATE TABLE documentos_seguros (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    responsavel SMALLINT,
    seguradora VARCHAR(180),
    cnpj_seguradora VARCHAR(14),
    apolice VARCHAR(60),
    averbacoes JSONB NOT NULL DEFAULT '[]'::JSONB,
    valor_carga NUMERIC(18, 2),
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_seguros_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_seguros_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave)
);

CREATE TABLE nfse_detalhes (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    numero_rps VARCHAR(30),
    serie_rps VARCHAR(10),
    tipo_rps VARCHAR(10),
    data_emissao_rps TIMESTAMPTZ,
    numero_lote VARCHAR(30),
    codigo_verificacao VARCHAR(50),
    local_incidencia VARCHAR(7),
    municipio_prestacao VARCHAR(7),
    item_lista_servico VARCHAR(10),
    codigo_tributacao_municipio VARCHAR(30),
    cnae VARCHAR(7),
    discriminacao TEXT,
    natureza_operacao SMALLINT,
    exigibilidade_iss SMALLINT,
    iss_retido BOOLEAN,
    responsavel_retencao SMALLINT,
    valor_deducoes NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_base_calculo NUMERIC(18, 2) NOT NULL DEFAULT 0,
    aliquota_iss NUMERIC(12, 6) NOT NULL DEFAULT 0,
    valor_iss NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_iss_retido NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_inss NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_ir NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_csll NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_pis NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_cofins NUMERIC(18, 2) NOT NULL DEFAULT 0,
    outras_retencoes NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_liquido NUMERIC(18, 2) NOT NULL DEFAULT 0,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT nfse_detalhes_identificador_uq UNIQUE (identificador),
    CONSTRAINT nfse_detalhes_documento_uq UNIQUE (documento_fiscal_chave),
    CONSTRAINT nfse_detalhes_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave)
);

-- Autorizacao, cancelamento, CC-e, manifestacao, desacordo de CT-e etc.
CREATE TABLE documentos_eventos (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    usuario_chave BIGINT,
    certificado_chave BIGINT,
    tipo_evento VARCHAR(40) NOT NULL,
    codigo_evento VARCHAR(10),
    sequencia INTEGER NOT NULL DEFAULT 1,
    ambiente SMALLINT NOT NULL DEFAULT 1,
    protocolo VARCHAR(80),
    data_evento TIMESTAMPTZ,
    data_retorno TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    codigo_retorno VARCHAR(10),
    motivo_retorno TEXT,
    justificativa TEXT,
    correcao TEXT,
    previsao_entrega DATE,
    indicador_aceitacao SMALLINT,
    xml_envio TEXT,
    xml_retorno TEXT,
    hash_sha256 CHAR(64),
    dados_adicionais JSONB NOT NULL DEFAULT '{}'::JSONB,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_eventos_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_eventos_sequencia_uq UNIQUE (documento_fiscal_chave, tipo_evento, sequencia),
    CONSTRAINT documentos_eventos_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave),
    CONSTRAINT documentos_eventos_usuario_fk FOREIGN KEY (usuario_chave) REFERENCES usuarios (chave),
    CONSTRAINT documentos_eventos_certificado_fk FOREIGN KEY (certificado_chave) REFERENCES certificados_digitais (chave),
    CONSTRAINT documentos_eventos_status_ck CHECK (status IN ('pendente', 'processando', 'aceito', 'rejeitado', 'erro', 'cancelado')),
    CONSTRAINT documentos_eventos_ambiente_ck CHECK (ambiente IN (1, 2)),
    CONSTRAINT documentos_eventos_sequencia_ck CHECK (sequencia > 0)
);

-- ---------------------------------------------------------------------------
-- ORGANIZACAO, COMPARTILHAMENTO, EXPORTACOES E AUDITORIA
-- ---------------------------------------------------------------------------

CREATE TABLE etiquetas (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cliente_chave BIGINT NOT NULL,
    nome VARCHAR(60) NOT NULL,
    cor CHAR(7),
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT etiquetas_identificador_uq UNIQUE (identificador),
    CONSTRAINT etiquetas_nome_uq UNIQUE (cliente_chave, nome),
    CONSTRAINT etiquetas_cliente_fk FOREIGN KEY (cliente_chave) REFERENCES clientes (chave),
    CONSTRAINT etiquetas_cor_ck CHECK (cor IS NULL OR cor ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE documentos_etiquetas (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    etiqueta_chave BIGINT NOT NULL,
    usuario_chave BIGINT,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_etiquetas_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_etiquetas_vinculo_uq UNIQUE (documento_fiscal_chave, etiqueta_chave),
    CONSTRAINT documentos_etiquetas_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave),
    CONSTRAINT documentos_etiquetas_etiqueta_fk FOREIGN KEY (etiqueta_chave) REFERENCES etiquetas (chave),
    CONSTRAINT documentos_etiquetas_usuario_fk FOREIGN KEY (usuario_chave) REFERENCES usuarios (chave)
);

-- Links temporarios para cliente/contador baixar XML, DANFE ou ZIP.
CREATE TABLE compartilhamentos (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cliente_chave BIGINT NOT NULL,
    usuario_chave BIGINT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    descricao VARCHAR(180),
    filtros JSONB NOT NULL DEFAULT '{}'::JSONB,
    permite_xml BOOLEAN NOT NULL DEFAULT TRUE,
    permite_pdf BOOLEAN NOT NULL DEFAULT TRUE,
    senha_hash TEXT,
    expira_em TIMESTAMPTZ NOT NULL,
    limite_downloads INTEGER,
    quantidade_downloads INTEGER NOT NULL DEFAULT 0,
    ultimo_download_em TIMESTAMPTZ,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT compartilhamentos_identificador_uq UNIQUE (identificador),
    CONSTRAINT compartilhamentos_token_uq UNIQUE (token_hash),
    CONSTRAINT compartilhamentos_cliente_fk FOREIGN KEY (cliente_chave) REFERENCES clientes (chave),
    CONSTRAINT compartilhamentos_usuario_fk FOREIGN KEY (usuario_chave) REFERENCES usuarios (chave),
    CONSTRAINT compartilhamentos_downloads_ck CHECK (quantidade_downloads >= 0 AND (limite_downloads IS NULL OR limite_downloads > 0))
);

CREATE TABLE exportacoes (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cliente_chave BIGINT NOT NULL,
    empresa_chave BIGINT,
    usuario_chave BIGINT NOT NULL,
    formato VARCHAR(20) NOT NULL,
    filtros JSONB NOT NULL DEFAULT '{}'::JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    quantidade_documentos INTEGER NOT NULL DEFAULT 0,
    storage_chave VARCHAR(1000),
    tamanho_bytes BIGINT,
    hash_sha256 CHAR(64),
    expira_em TIMESTAMPTZ,
    mensagem_erro TEXT,
    iniciada_em TIMESTAMPTZ,
    finalizada_em TIMESTAMPTZ,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT exportacoes_identificador_uq UNIQUE (identificador),
    CONSTRAINT exportacoes_cliente_fk FOREIGN KEY (cliente_chave) REFERENCES clientes (chave),
    CONSTRAINT exportacoes_empresa_fk FOREIGN KEY (empresa_chave) REFERENCES empresas (chave),
    CONSTRAINT exportacoes_usuario_fk FOREIGN KEY (usuario_chave) REFERENCES usuarios (chave),
    CONSTRAINT exportacoes_formato_ck CHECK (formato IN ('xml', 'pdf', 'xml_pdf', 'csv', 'xlsx', 'json')),
    CONSTRAINT exportacoes_status_ck CHECK (status IN ('pendente', 'processando', 'concluida', 'erro', 'expirada', 'cancelada')),
    CONSTRAINT exportacoes_quantidade_ck CHECK (quantidade_documentos >= 0)
);

CREATE TABLE chaves_api (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cliente_chave BIGINT NOT NULL,
    empresa_chave BIGINT,
    usuario_chave BIGINT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    prefixo VARCHAR(20) NOT NULL,
    segredo_hash CHAR(64) NOT NULL,
    permissoes JSONB NOT NULL DEFAULT '[]'::JSONB,
    redes_permitidas JSONB NOT NULL DEFAULT '[]'::JSONB,
    expira_em TIMESTAMPTZ,
    ultimo_uso_em TIMESTAMPTZ,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chaves_api_identificador_uq UNIQUE (identificador),
    CONSTRAINT chaves_api_segredo_uq UNIQUE (segredo_hash),
    CONSTRAINT chaves_api_cliente_fk FOREIGN KEY (cliente_chave) REFERENCES clientes (chave),
    CONSTRAINT chaves_api_empresa_fk FOREIGN KEY (empresa_chave) REFERENCES empresas (chave),
    CONSTRAINT chaves_api_usuario_fk FOREIGN KEY (usuario_chave) REFERENCES usuarios (chave)
);

CREATE TABLE auditoria (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cliente_chave BIGINT,
    empresa_chave BIGINT,
    usuario_chave BIGINT,
    entidade VARCHAR(80) NOT NULL,
    entidade_chave BIGINT,
    entidade_identificador UUID,
    acao VARCHAR(40) NOT NULL,
    resultado VARCHAR(20) NOT NULL DEFAULT 'sucesso',
    descricao TEXT,
    dados_anteriores JSONB,
    dados_novos JSONB,
    metadados JSONB NOT NULL DEFAULT '{}'::JSONB,
    endereco_ip INET,
    user_agent TEXT,
    correlacao_id UUID,
    dataevento TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    datahoracad TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auditoria_identificador_uq UNIQUE (identificador),
    CONSTRAINT auditoria_cliente_fk FOREIGN KEY (cliente_chave) REFERENCES clientes (chave),
    CONSTRAINT auditoria_empresa_fk FOREIGN KEY (empresa_chave) REFERENCES empresas (chave),
    CONSTRAINT auditoria_usuario_fk FOREIGN KEY (usuario_chave) REFERENCES usuarios (chave),
    CONSTRAINT auditoria_resultado_ck CHECK (resultado IN ('sucesso', 'falha', 'negado'))
);

-- ---------------------------------------------------------------------------
-- INDICES PARA OS FLUXOS REAIS DA APLICACAO
-- ---------------------------------------------------------------------------

CREATE INDEX clientes_usuarios_usuario_idx ON clientes_usuarios (usuario_chave, ativo);
CREATE INDEX empresas_cliente_ativo_idx ON empresas (cliente_chave, ativo);
CREATE INDEX empresas_usuarios_usuario_idx ON empresas_usuarios (usuario_chave, ativo);
CREATE INDEX certificados_empresa_validade_idx ON certificados_digitais (empresa_chave, valido_ate DESC) WHERE ativo = TRUE;
CREATE INDEX integracoes_empresa_tipo_idx ON integracoes (empresa_chave, tipo, ativo);
CREATE INDEX distribuicao_proxima_consulta_idx ON distribuicao_dfe_controle (proxima_consulta_em) WHERE ativo = TRUE;
CREATE INDEX consultas_fila_idx ON consultas_fiscais (status, prioridade, datahoracad) WHERE ativo = TRUE;
CREATE INDEX consultas_empresa_data_idx ON consultas_fiscais (empresa_chave, datahoracad DESC);
CREATE INDEX consultas_erros_consulta_idx ON consultas_fiscais_erros (consulta_fiscal_chave, datahoracad DESC);
CREATE INDEX participantes_nome_idx ON participantes_fiscais USING BTREE (LOWER(nome_razao_social));
CREATE INDEX participantes_enderecos_participante_idx ON participantes_enderecos (participante_chave, tipo);
CREATE INDEX documentos_empresa_emissao_idx ON documentos_fiscais (empresa_chave, data_emissao DESC) WHERE ativo = TRUE;
CREATE INDEX documentos_empresa_captura_idx ON documentos_fiscais (empresa_chave, data_captura DESC) WHERE ativo = TRUE;
CREATE INDEX documentos_empresa_status_idx ON documentos_fiscais (empresa_chave, status, manifestacao_status) WHERE ativo = TRUE;
CREATE INDEX documentos_chave_acesso_idx ON documentos_fiscais (chave_acesso);
CREATE INDEX documentos_empresa_nsu_idx ON documentos_fiscais (empresa_chave, nsu) WHERE nsu IS NOT NULL;
CREATE INDEX documentos_numero_idx ON documentos_fiscais (empresa_chave, tipo_documento, serie, numero);
CREATE INDEX documentos_valor_idx ON documentos_fiscais (empresa_chave, valor_total);
CREATE INDEX documentos_dados_adicionais_gin_idx ON documentos_fiscais USING GIN (dados_adicionais);
CREATE INDEX documentos_participantes_participante_idx ON documentos_participantes (participante_chave, papel);
CREATE INDEX documentos_arquivos_documento_idx ON documentos_arquivos (documento_fiscal_chave, tipo) WHERE ativo = TRUE;
CREATE INDEX documentos_arquivos_hash_idx ON documentos_arquivos (hash_sha256);
CREATE INDEX documentos_itens_documento_idx ON documentos_itens (documento_fiscal_chave, numero_item);
CREATE INDEX documentos_itens_ncm_cfop_idx ON documentos_itens (ncm, cfop);
CREATE INDEX documentos_itens_descricao_idx ON documentos_itens USING BTREE (LOWER(descricao));
CREATE INDEX itens_tributos_item_idx ON documentos_itens_tributos (documento_item_chave, tributo);
CREATE INDEX documentos_pagamentos_documento_idx ON documentos_pagamentos (documento_fiscal_chave);
CREATE INDEX documentos_parcelas_vencimento_idx ON documentos_parcelas (vencimento);
CREATE INDEX documentos_referencias_chave_idx ON documentos_referencias (chave_acesso) WHERE chave_acesso IS NOT NULL;
CREATE INDEX eventos_documento_data_idx ON documentos_eventos (documento_fiscal_chave, data_evento DESC);
CREATE INDEX eventos_status_idx ON documentos_eventos (status, datahoracad) WHERE ativo = TRUE;
CREATE INDEX exportacoes_fila_idx ON exportacoes (status, datahoracad) WHERE ativo = TRUE;
CREATE INDEX auditoria_cliente_data_idx ON auditoria (cliente_chave, dataevento DESC);
CREATE INDEX auditoria_empresa_data_idx ON auditoria (empresa_chave, dataevento DESC);
CREATE INDEX auditoria_usuario_data_idx ON auditoria (usuario_chave, dataevento DESC);
CREATE INDEX auditoria_entidade_idx ON auditoria (entidade, entidade_chave, dataevento DESC);

-- Usuario inicial apenas para desenvolvimento local.
INSERT INTO usuarios (nome, email, login, senha, perfil_global, trocar_senha)
VALUES ('Administrador', 'admin@safe-nfe.local', 'admin', '123456', 'superadmin', FALSE);

INSERT INTO configuracoes_sistema (nome_sistema)
VALUES ('Safe NFe');

COMMIT;
