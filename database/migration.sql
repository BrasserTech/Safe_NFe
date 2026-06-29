CREATE TABLE app_config (
    chave INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    datahoraalt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    nome_sistema VARCHAR(150) NOT NULL DEFAULT 'Cofre Fiscal',
    ambiente VARCHAR(20) NOT NULL DEFAULT 'homologacao',
    sefaz_uf VARCHAR(2),
    sefaz_ambiente VARCHAR(20) NOT NULL DEFAULT 'homologacao',
    intervalo_sincronizacao_minutos INTEGER NOT NULL DEFAULT 60,
    caminho_storage_certificados TEXT,
    caminho_storage_xml TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE empresas (
    chave INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    datahoraalt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    razao_social VARCHAR(180) NOT NULL,
    nome_fantasia VARCHAR(180),
    cnpj VARCHAR(14) NOT NULL,
    inscricao_estadual VARCHAR(30),
    uf VARCHAR(2),
    cidade VARCHAR(120),
    email VARCHAR(180),
    telefone VARCHAR(30),
    ultimo_nsu_nfe VARCHAR(30),
    max_nsu_nfe VARCHAR(30),
    ultimo_nsu_cte VARCHAR(30),
    max_nsu_cte VARCHAR(30),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT empresas_cnpj_unique UNIQUE (cnpj)
);

CREATE TABLE certificados_digitais (
    chave INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    datahoraalt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    empresa_chave INTEGER NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    senha_criptografada TEXT NOT NULL,
    titular VARCHAR(255) NOT NULL,
    documento VARCHAR(14) NOT NULL,
    validade TIMESTAMP NOT NULL,
    tipo VARCHAR(10) NOT NULL DEFAULT 'A1',
    status VARCHAR(30) NOT NULL DEFAULT 'valido',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT certificados_digitais_empresa_fk
        FOREIGN KEY (empresa_chave) REFERENCES empresas (chave)
);

CREATE TABLE notas_fiscais (
    chave INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    datahoraalt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    empresa_chave INTEGER NOT NULL,
    chave_acesso VARCHAR(44) NOT NULL,
    numero VARCHAR(30),
    serie VARCHAR(10),
    tipo VARCHAR(20) NOT NULL,
    emitente_nome VARCHAR(180),
    emitente_cnpj VARCHAR(14),
    destinatario_nome VARCHAR(180),
    destinatario_cnpj VARCHAR(14),
    data_emissao TIMESTAMP,
    valor_total NUMERIC(15, 2),
    status VARCHAR(40) NOT NULL DEFAULT 'pendente',
    nsu VARCHAR(30),
    xml TEXT,
    caminho_xml TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT notas_fiscais_chave_acesso_unique UNIQUE (chave_acesso),
    CONSTRAINT notas_fiscais_empresa_fk
        FOREIGN KEY (empresa_chave) REFERENCES empresas (chave)
);

CREATE TABLE usuarios (
    chave INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    datahoraalt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    nome VARCHAR(150) NOT NULL,
    email VARCHAR(180) NOT NULL,
    senha_hash TEXT NOT NULL,
    perfil VARCHAR(40) NOT NULL DEFAULT 'admin',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT usuarios_email_unique UNIQUE (email)
);

CREATE TABLE manifestacoes_nfe (
    chave INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    datahoraalt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    nota_fiscal_chave INTEGER NOT NULL,
    empresa_chave INTEGER NOT NULL,
    tipo_manifestacao VARCHAR(60) NOT NULL,
    protocolo VARCHAR(80),
    justificativa TEXT,
    data_manifestacao TIMESTAMP,
    status VARCHAR(40) NOT NULL DEFAULT 'pendente',
    retorno_sefaz TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT manifestacoes_nfe_nota_fiscal_fk
        FOREIGN KEY (nota_fiscal_chave) REFERENCES notas_fiscais (chave),
    CONSTRAINT manifestacoes_nfe_empresa_fk
        FOREIGN KEY (empresa_chave) REFERENCES empresas (chave)
);

CREATE INDEX idx_empresas_cnpj ON empresas (cnpj);
CREATE INDEX idx_notas_fiscais_chave_acesso ON notas_fiscais (chave_acesso);
CREATE INDEX idx_notas_fiscais_empresa_chave ON notas_fiscais (empresa_chave);
CREATE INDEX idx_notas_fiscais_emitente_cnpj ON notas_fiscais (emitente_cnpj);
CREATE INDEX idx_notas_fiscais_data_emissao ON notas_fiscais (data_emissao);
CREATE INDEX idx_certificados_digitais_empresa_chave ON certificados_digitais (empresa_chave);
