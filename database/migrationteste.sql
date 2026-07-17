-- Safe NFe - modelo relacional de teste (PostgreSQL)
-- Copia evolutiva de migration.sql. O arquivo original foi preservado.
--
-- Convencao obrigatoria em todas as tabelas:
--   chave        : chave primaria interna
--   ativo        : exclusao/inativacao logica controlada pela aplicacao
--   identificador: UUID publico, gerado pelo banco e imutavel
--   datahoraalt  : data/hora da ultima alteracao, atualizada pela aplicacao
--
-- Nao ha triggers nem procedures neste migration. Validacoes, auditoria,
-- inativacoes e atualizacao de datahoraalt devem ser feitas pelo codigo.

BEGIN;

CREATE TABLE app_config (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nome_sistema VARCHAR(150) NOT NULL DEFAULT 'Safe NFe',
    ambiente VARCHAR(20) NOT NULL DEFAULT 'homologacao',
    sefaz_ambiente SMALLINT NOT NULL DEFAULT 2,
    intervalo_sincronizacao_minutos INTEGER NOT NULL DEFAULT 60,
    caminho_storage_certificados TEXT,
    caminho_storage_documentos TEXT,
    datacriacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT app_config_identificador_uq UNIQUE (identificador),
    CONSTRAINT app_config_ambiente_ck CHECK (ambiente IN ('homologacao', 'producao')),
    CONSTRAINT app_config_sefaz_ambiente_ck CHECK (sefaz_ambiente IN (1, 2))
);

-- A senha esta propositalmente sem criptografia apenas nesta fase de teste.
-- Antes de producao, substituir senha por senha_hash e usar Argon2id ou bcrypt.
CREATE TABLE usuarios (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(180) NOT NULL,
    login VARCHAR(100) NOT NULL,
    senha TEXT NOT NULL,
    perfil VARCHAR(30) NOT NULL DEFAULT 'admin',
    ultimo_login_em TIMESTAMPTZ,
    datacriacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_identificador_uq UNIQUE (identificador),
    CONSTRAINT usuarios_email_uq UNIQUE (email),
    CONSTRAINT usuarios_login_uq UNIQUE (login),
    CONSTRAINT usuarios_perfil_ck CHECK (perfil IN ('admin', 'operador', 'contador', 'consulta'))
);

-- Cliente representa a conta/organizacao contratante do Safe NFe.
CREATE TABLE clientes (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nome VARCHAR(180) NOT NULL,
    documento VARCHAR(14),
    email VARCHAR(180),
    telefone VARCHAR(30),
    plano VARCHAR(50),
    datacriacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT clientes_identificador_uq UNIQUE (identificador),
    CONSTRAINT clientes_documento_uq UNIQUE (documento)
);

CREATE TABLE usuarios_clientes (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_chave BIGINT NOT NULL,
    cliente_chave BIGINT NOT NULL,
    perfil_cliente VARCHAR(30) NOT NULL DEFAULT 'consulta',
    datacriacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_clientes_identificador_uq UNIQUE (identificador),
    CONSTRAINT usuarios_clientes_usuario_cliente_uq UNIQUE (usuario_chave, cliente_chave),
    CONSTRAINT usuarios_clientes_usuario_fk FOREIGN KEY (usuario_chave) REFERENCES usuarios (chave),
    CONSTRAINT usuarios_clientes_cliente_fk FOREIGN KEY (cliente_chave) REFERENCES clientes (chave)
);

-- Uma conta cliente pode administrar varias empresas/CNPJs.
CREATE TABLE empresas (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cliente_chave BIGINT NOT NULL,
    razao_social VARCHAR(180) NOT NULL,
    nome_fantasia VARCHAR(180),
    cnpj VARCHAR(14) NOT NULL,
    inscricao_estadual VARCHAR(30),
    inscricao_municipal VARCHAR(30),
    regime_tributario SMALLINT,
    cnae VARCHAR(10),
    email VARCHAR(180),
    telefone VARCHAR(30),
    logradouro VARCHAR(180),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    codigo_municipio VARCHAR(7),
    municipio VARCHAR(120),
    uf CHAR(2),
    cep VARCHAR(8),
    ultimo_nsu_nfe VARCHAR(30),
    max_nsu_nfe VARCHAR(30),
    ultimo_nsu_cte VARCHAR(30),
    max_nsu_cte VARCHAR(30),
    datacriacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT empresas_identificador_uq UNIQUE (identificador),
    CONSTRAINT empresas_cnpj_uq UNIQUE (cnpj),
    CONSTRAINT empresas_cliente_fk FOREIGN KEY (cliente_chave) REFERENCES clientes (chave),
    CONSTRAINT empresas_cnpj_ck CHECK (cnpj ~ '^[0-9]{14}$')
);

CREATE TABLE certificados_digitais (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    empresa_chave BIGINT NOT NULL,
    tipo VARCHAR(10) NOT NULL DEFAULT 'A1',
    titular VARCHAR(255) NOT NULL,
    documento VARCHAR(14) NOT NULL,
    numero_serie VARCHAR(180),
    emissor VARCHAR(255),
    valido_de TIMESTAMPTZ,
    valido_ate TIMESTAMPTZ NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    senha_criptografada TEXT NOT NULL,
    impressao_digital VARCHAR(128),
    status VARCHAR(30) NOT NULL DEFAULT 'valido',
    datacriacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT certificados_identificador_uq UNIQUE (identificador),
    CONSTRAINT certificados_empresa_fk FOREIGN KEY (empresa_chave) REFERENCES empresas (chave),
    CONSTRAINT certificados_tipo_ck CHECK (tipo IN ('A1', 'A3'))
);

-- Cada chamada a SEFAZ, prefeitura ou provedor fiscal gera uma consulta.
CREATE TABLE consultas_fiscais (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    empresa_chave BIGINT NOT NULL,
    certificado_chave BIGINT,
    usuario_chave BIGINT,
    tipo_documento VARCHAR(10) NOT NULL,
    fonte VARCHAR(30) NOT NULL,
    ambiente SMALLINT NOT NULL DEFAULT 2,
    modo_consulta VARCHAR(30) NOT NULL,
    nsu_inicial VARCHAR(30),
    ultimo_nsu VARCHAR(30),
    max_nsu VARCHAR(30),
    chave_acesso_consultada VARCHAR(44),
    data_inicio TIMESTAMPTZ,
    data_fim TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    codigo_retorno VARCHAR(20),
    mensagem_retorno TEXT,
    quantidade_documentos INTEGER NOT NULL DEFAULT 0,
    requisicao JSONB,
    resposta JSONB,
    iniciada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finalizada_em TIMESTAMPTZ,
    datacriacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT consultas_identificador_uq UNIQUE (identificador),
    CONSTRAINT consultas_empresa_fk FOREIGN KEY (empresa_chave) REFERENCES empresas (chave),
    CONSTRAINT consultas_certificado_fk FOREIGN KEY (certificado_chave) REFERENCES certificados_digitais (chave),
    CONSTRAINT consultas_usuario_fk FOREIGN KEY (usuario_chave) REFERENCES usuarios (chave),
    CONSTRAINT consultas_ambiente_ck CHECK (ambiente IN (1, 2)),
    CONSTRAINT consultas_quantidade_ck CHECK (quantidade_documentos >= 0)
);

-- Pessoas juridicas/fisicas encontradas nos documentos, evitando repeticao.
CREATE TABLE participantes_fiscais (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cpf_cnpj VARCHAR(14),
    nome_razao_social VARCHAR(180) NOT NULL,
    nome_fantasia VARCHAR(180),
    inscricao_estadual VARCHAR(30),
    email VARCHAR(180),
    telefone VARCHAR(30),
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
    datacriacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT participantes_identificador_uq UNIQUE (identificador),
    CONSTRAINT participantes_documento_uq UNIQUE (cpf_cnpj)
);

-- Cabecalho comum para NF-e, NFC-e, CT-e e NFS-e.
-- O XML original e a fonte de verdade; campos normalizados aceleram pesquisas.
CREATE TABLE documentos_fiscais (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    empresa_chave BIGINT NOT NULL,
    consulta_fiscal_chave BIGINT,
    emitente_chave BIGINT,
    destinatario_chave BIGINT,
    tomador_chave BIGINT,
    tipo_documento VARCHAR(10) NOT NULL,
    modelo VARCHAR(4),
    serie VARCHAR(10),
    numero VARCHAR(30),
    chave_acesso VARCHAR(44),
    codigo_numerico VARCHAR(20),
    protocolo_autorizacao VARCHAR(30),
    recibo VARCHAR(30),
    nsu VARCHAR(30),
    direcao VARCHAR(10) NOT NULL,
    ambiente SMALLINT NOT NULL DEFAULT 2,
    finalidade SMALLINT,
    natureza_operacao VARCHAR(180),
    data_emissao TIMESTAMPTZ,
    data_saida_entrada TIMESTAMPTZ,
    data_autorizacao TIMESTAMPTZ,
    competencia DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    codigo_status VARCHAR(10),
    motivo_status TEXT,
    valor_produtos NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_servicos NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_frete NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_seguro NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_desconto NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_outras_despesas NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_icms NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_icms_st NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_ipi NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_pis NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_cofins NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_iss NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_total_tributos NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
    informacoes_complementares TEXT,
    hash_xml CHAR(64),
    versao_xml VARCHAR(10),
    schema_xml VARCHAR(80),
    xml_original TEXT NOT NULL,
    xml_resumo TEXT,
    dados_adicionais JSONB,
    datacaptura TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    datacriacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_tipo_chave_uq UNIQUE (tipo_documento, chave_acesso),
    CONSTRAINT documentos_empresa_fk FOREIGN KEY (empresa_chave) REFERENCES empresas (chave),
    CONSTRAINT documentos_consulta_fk FOREIGN KEY (consulta_fiscal_chave) REFERENCES consultas_fiscais (chave),
    CONSTRAINT documentos_emitente_fk FOREIGN KEY (emitente_chave) REFERENCES participantes_fiscais (chave),
    CONSTRAINT documentos_destinatario_fk FOREIGN KEY (destinatario_chave) REFERENCES participantes_fiscais (chave),
    CONSTRAINT documentos_tomador_fk FOREIGN KEY (tomador_chave) REFERENCES participantes_fiscais (chave),
    CONSTRAINT documentos_tipo_ck CHECK (tipo_documento IN ('NFE', 'NFCE', 'CTE', 'NFSE')),
    CONSTRAINT documentos_direcao_ck CHECK (direcao IN ('entrada', 'saida')),
    CONSTRAINT documentos_ambiente_ck CHECK (ambiente IN (1, 2)),
    CONSTRAINT documentos_chave_acesso_ck CHECK (chave_acesso IS NULL OR chave_acesso ~ '^[0-9]{44}$')
);

CREATE TABLE documentos_arquivos (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    tipo_arquivo VARCHAR(20) NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    tamanho_bytes BIGINT,
    hash_sha256 CHAR(64),
    caminho_storage TEXT,
    conteudo BYTEA,
    datacriacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_arquivos_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_arquivos_documento_tipo_uq UNIQUE (documento_fiscal_chave, tipo_arquivo),
    CONSTRAINT documentos_arquivos_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave),
    CONSTRAINT documentos_arquivos_tipo_ck CHECK (tipo_arquivo IN ('xml', 'pdf', 'danfe', 'evento', 'outro')),
    CONSTRAINT documentos_arquivos_storage_ck CHECK (caminho_storage IS NOT NULL OR conteudo IS NOT NULL)
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
    descricao VARCHAR(255) NOT NULL,
    ncm VARCHAR(8),
    cest VARCHAR(7),
    cfop VARCHAR(4),
    unidade VARCHAR(10),
    quantidade NUMERIC(18, 6) NOT NULL DEFAULT 0,
    valor_unitario NUMERIC(18, 10) NOT NULL DEFAULT 0,
    valor_bruto NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_desconto NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_frete NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_seguro NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_outros NUMERIC(18, 2) NOT NULL DEFAULT 0,
    valor_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
    pedido_compra VARCHAR(30),
    item_pedido VARCHAR(10),
    informacoes_adicionais TEXT,
    dados_adicionais JSONB,
    datacriacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_itens_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_itens_documento_numero_uq UNIQUE (documento_fiscal_chave, numero_item),
    CONSTRAINT documentos_itens_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave)
);

-- Uma linha por tributo de cada item permite ICMS, IPI, PIS, COFINS, ISSQN etc.
CREATE TABLE documentos_itens_tributos (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_item_chave BIGINT NOT NULL,
    tributo VARCHAR(20) NOT NULL,
    origem VARCHAR(3),
    cst VARCHAR(4),
    csosn VARCHAR(4),
    modalidade_bc VARCHAR(3),
    base_calculo NUMERIC(18, 2) NOT NULL DEFAULT 0,
    aliquota NUMERIC(12, 6) NOT NULL DEFAULT 0,
    quantidade_base NUMERIC(18, 6),
    valor_unitario NUMERIC(18, 10),
    valor_tributo NUMERIC(18, 2) NOT NULL DEFAULT 0,
    dados_adicionais JSONB,
    datacriacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT itens_tributos_identificador_uq UNIQUE (identificador),
    CONSTRAINT itens_tributos_item_tipo_uq UNIQUE (documento_item_chave, tributo),
    CONSTRAINT itens_tributos_item_fk FOREIGN KEY (documento_item_chave) REFERENCES documentos_itens (chave)
);

CREATE TABLE documentos_cobrancas (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    numero_parcela VARCHAR(30),
    forma_pagamento VARCHAR(20),
    meio_pagamento VARCHAR(100),
    vencimento DATE,
    valor NUMERIC(18, 2) NOT NULL DEFAULT 0,
    datacriacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_cobrancas_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_cobrancas_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave)
);

CREATE TABLE documentos_transporte (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    transportador_chave BIGINT,
    modalidade_frete SMALLINT,
    placa VARCHAR(10),
    uf_veiculo CHAR(2),
    rntc VARCHAR(20),
    quantidade_volumes NUMERIC(18, 3),
    especie VARCHAR(60),
    marca VARCHAR(60),
    numeracao VARCHAR(60),
    peso_liquido NUMERIC(18, 3),
    peso_bruto NUMERIC(18, 3),
    dados_adicionais JSONB,
    datacriacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_transporte_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_transporte_documento_uq UNIQUE (documento_fiscal_chave),
    CONSTRAINT documentos_transporte_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave),
    CONSTRAINT documentos_transporte_transportador_fk FOREIGN KEY (transportador_chave) REFERENCES participantes_fiscais (chave)
);

-- Cancelamento, carta de correcao, autorizacao, ciencia, confirmacao etc.
CREATE TABLE documentos_eventos (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_fiscal_chave BIGINT NOT NULL,
    usuario_chave BIGINT,
    tipo_evento VARCHAR(60) NOT NULL,
    codigo_evento VARCHAR(10),
    sequencia INTEGER NOT NULL DEFAULT 1,
    protocolo VARCHAR(80),
    data_evento TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    codigo_retorno VARCHAR(10),
    motivo_retorno TEXT,
    justificativa TEXT,
    xml_evento TEXT,
    xml_retorno TEXT,
    dados_adicionais JSONB,
    datacriacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_eventos_identificador_uq UNIQUE (identificador),
    CONSTRAINT documentos_eventos_documento_tipo_seq_uq UNIQUE (documento_fiscal_chave, tipo_evento, sequencia),
    CONSTRAINT documentos_eventos_documento_fk FOREIGN KEY (documento_fiscal_chave) REFERENCES documentos_fiscais (chave),
    CONSTRAINT documentos_eventos_usuario_fk FOREIGN KEY (usuario_chave) REFERENCES usuarios (chave),
    CONSTRAINT documentos_eventos_sequencia_ck CHECK (sequencia > 0)
);

CREATE TABLE auditoria (
    chave BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    identificador UUID NOT NULL DEFAULT gen_random_uuid(),
    datahoraalt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_chave BIGINT,
    cliente_chave BIGINT,
    empresa_chave BIGINT,
    entidade VARCHAR(80) NOT NULL,
    entidade_chave BIGINT,
    acao VARCHAR(40) NOT NULL,
    detalhes TEXT,
    dados_anteriores JSONB,
    dados_novos JSONB,
    endereco_ip VARCHAR(45),
    user_agent TEXT,
    dataevento TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auditoria_identificador_uq UNIQUE (identificador),
    CONSTRAINT auditoria_usuario_fk FOREIGN KEY (usuario_chave) REFERENCES usuarios (chave),
    CONSTRAINT auditoria_cliente_fk FOREIGN KEY (cliente_chave) REFERENCES clientes (chave),
    CONSTRAINT auditoria_empresa_fk FOREIGN KEY (empresa_chave) REFERENCES empresas (chave)
);

CREATE INDEX idx_usuarios_ativo ON usuarios (ativo);
CREATE INDEX idx_clientes_ativo ON clientes (ativo);
CREATE INDEX idx_usuarios_clientes_cliente ON usuarios_clientes (cliente_chave, ativo);
CREATE INDEX idx_empresas_cliente ON empresas (cliente_chave, ativo);
CREATE INDEX idx_empresas_cnpj ON empresas (cnpj);
CREATE INDEX idx_certificados_empresa_validade ON certificados_digitais (empresa_chave, valido_ate);
CREATE INDEX idx_consultas_empresa_data ON consultas_fiscais (empresa_chave, iniciada_em DESC);
CREATE INDEX idx_consultas_status ON consultas_fiscais (status, ativo);
CREATE INDEX idx_participantes_documento ON participantes_fiscais (cpf_cnpj);
CREATE INDEX idx_documentos_empresa_emissao ON documentos_fiscais (empresa_chave, data_emissao DESC);
CREATE INDEX idx_documentos_chave_acesso ON documentos_fiscais (chave_acesso);
CREATE INDEX idx_documentos_nsu ON documentos_fiscais (empresa_chave, nsu);
CREATE INDEX idx_documentos_emitente ON documentos_fiscais (emitente_chave);
CREATE INDEX idx_documentos_destinatario ON documentos_fiscais (destinatario_chave);
CREATE INDEX idx_documentos_status ON documentos_fiscais (status, ativo);
CREATE INDEX idx_itens_documento ON documentos_itens (documento_fiscal_chave);
CREATE INDEX idx_eventos_documento_data ON documentos_eventos (documento_fiscal_chave, data_evento DESC);
CREATE INDEX idx_auditoria_entidade ON auditoria (entidade, entidade_chave, dataevento DESC);
CREATE INDEX idx_auditoria_usuario ON auditoria (usuario_chave, dataevento DESC);

-- Usuario inicial de TESTE. Nao usar esta credencial em producao.
INSERT INTO usuarios (nome, email, login, senha, perfil)
VALUES ('Administrador', 'admin@safe-nfe.local', 'admin', '123456', 'admin');

COMMIT;
