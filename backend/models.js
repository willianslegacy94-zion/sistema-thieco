const { query } = require('./db');

// ─── DDL ────────────────────────────────────────────────────────────────────

const CREATE_ENUM_UNIDADE = `
  DO $$ BEGIN
    CREATE TYPE unidade_enum AS ENUM ('tambore', 'mutinga');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
`;

const CREATE_PROFISSIONAIS = `
  CREATE TABLE IF NOT EXISTS profissionais (
    id                  SERIAL PRIMARY KEY,
    nome                VARCHAR(100) NOT NULL,
    unidade             unidade_enum NOT NULL,
    percentual_comissao NUMERIC(5,2) NOT NULL DEFAULT 40.00,
    ativo               BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const CREATE_VENDAS = `
  CREATE TABLE IF NOT EXISTS vendas (
    id                SERIAL PRIMARY KEY,
    unidade           unidade_enum NOT NULL,
    profissional_id   INTEGER REFERENCES profissionais(id) ON DELETE SET NULL,
    servico           VARCHAR(120) NOT NULL,
    valor             NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
    comissao          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (comissao >= 0),
    forma_pagamento   VARCHAR(30) NOT NULL DEFAULT 'dinheiro',
    data              DATE NOT NULL,
    observacao        TEXT,
    importado         BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_vendas_data        ON vendas(data);
  CREATE INDEX IF NOT EXISTS idx_vendas_unidade     ON vendas(unidade);
  CREATE INDEX IF NOT EXISTS idx_vendas_profissional ON vendas(profissional_id);
`;

const CREATE_GASTOS = `
  CREATE TABLE IF NOT EXISTS gastos (
    id          SERIAL PRIMARY KEY,
    unidade     unidade_enum NOT NULL,
    categoria   VARCHAR(60) NOT NULL,
    descricao   VARCHAR(255) NOT NULL,
    valor       NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
    data        DATE NOT NULL,
    observacao  TEXT,
    importado   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_gastos_data    ON gastos(data);
  CREATE INDEX IF NOT EXISTS idx_gastos_unidade ON gastos(unidade);
`;

// Novos campos em vendas
const ALTER_VENDAS_NOVOS_CAMPOS = `
  ALTER TABLE vendas
    ADD COLUMN IF NOT EXISTS tipo_cliente    VARCHAR(20)    NOT NULL DEFAULT 'agendado',
    ADD COLUMN IF NOT EXISTS desconto        NUMERIC(10,2)  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS upsell          BOOLEAN        NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS venda_origem_id INTEGER        REFERENCES vendas(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS qtd_clientes    SMALLINT       NOT NULL DEFAULT 1;
`;

// Novo campo em gastos
const ALTER_GASTOS_VALOR_PREVISTO = `
  ALTER TABLE gastos
    ADD COLUMN IF NOT EXISTS valor_previsto NUMERIC(10,2);
`;

const ADD_UNIQUE_PROF_NOME = `
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'uq_prof_nome' AND conrelid = 'profissionais'::regclass
    ) THEN
      ALTER TABLE profissionais ADD CONSTRAINT uq_prof_nome UNIQUE (nome);
    END IF;
  END $$;
`;

const SEED_PROFISSIONAIS = `
  INSERT INTO profissionais (nome, unidade, percentual_comissao)
  VALUES
    ('Thieco Leandro',   'tambore', 50.00),
    ('Igor Hidalgo',     'mutinga', 40.00),
    ('Kauã dos Santos',  'mutinga', 40.00),
    ('Marcos Fernandes', 'mutinga', 40.00)
  ON CONFLICT (nome) DO NOTHING;
`;

// ─── DDL Gestão de Time ──────────────────────────────────────────────────────

const CREATE_FEEDBACKS = `
  DO $$ BEGIN
    CREATE TYPE feedback_tipo_enum AS ENUM ('elogio', 'melhoria');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  CREATE TABLE IF NOT EXISTS feedbacks (
    id               SERIAL PRIMARY KEY,
    profissional_id  INTEGER NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
    tipo             feedback_tipo_enum NOT NULL,
    categoria        VARCHAR(60) NOT NULL DEFAULT 'outros',
    titulo           VARCHAR(150) NOT NULL,
    descricao        TEXT NOT NULL,
    data             DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_feedbacks_prof ON feedbacks(profissional_id);
  CREATE INDEX IF NOT EXISTS idx_feedbacks_data ON feedbacks(data);
`;

const CREATE_PLANOS_ACAO = `
  DO $$ BEGIN
    CREATE TYPE pdca_status_enum AS ENUM ('pendente','em_andamento','concluido','cancelado');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  CREATE TABLE IF NOT EXISTS planos_acao (
    id               SERIAL PRIMARY KEY,
    profissional_id  INTEGER NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
    titulo           VARCHAR(200) NOT NULL,
    planejar         TEXT NOT NULL,
    executar         TEXT NOT NULL DEFAULT '',
    checar           TEXT NOT NULL DEFAULT '',
    agir             TEXT NOT NULL DEFAULT '',
    status           pdca_status_enum NOT NULL DEFAULT 'pendente',
    data_inicio      DATE NOT NULL DEFAULT CURRENT_DATE,
    data_meta        DATE,
    data_conclusao   DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_pdca_prof   ON planos_acao(profissional_id);
  CREATE INDEX IF NOT EXISTS idx_pdca_status ON planos_acao(status);
`;

const CREATE_SUGESTOES = `
  DO $$ BEGIN
    CREATE TYPE sugestao_status_enum AS ENUM ('aberta','em_analise','aprovada','implementada','rejeitada');
    CREATE TYPE sugestao_prioridade_enum AS ENUM ('baixa','media','alta');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  CREATE TABLE IF NOT EXISTS sugestoes (
    id          SERIAL PRIMARY KEY,
    unidade     VARCHAR(30) NOT NULL DEFAULT 'geral',
    categoria   VARCHAR(60) NOT NULL DEFAULT 'outros',
    titulo      VARCHAR(200) NOT NULL,
    descricao   TEXT NOT NULL,
    prioridade  sugestao_prioridade_enum NOT NULL DEFAULT 'media',
    status      sugestao_status_enum NOT NULL DEFAULT 'aberta',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

// ─── DDL Combos ─────────────────────────────────────────────────────────────

const CREATE_COMBOS = `
  CREATE TABLE IF NOT EXISTS combos (
    id                SERIAL PRIMARY KEY,
    cliente_nome      VARCHAR(100) NOT NULL,
    cliente_contato   VARCHAR(50),
    profissional_id   INTEGER REFERENCES profissionais(id) ON DELETE SET NULL,
    unidade           unidade_enum NOT NULL,
    data_aquisicao    DATE NOT NULL,
    data_vencimento   DATE NOT NULL,
    servicos          TEXT NOT NULL,
    valor             NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
    ativo             BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_combos_unidade      ON combos(unidade);
  CREATE INDEX IF NOT EXISTS idx_combos_vencimento   ON combos(data_vencimento);
  CREATE INDEX IF NOT EXISTS idx_combos_profissional ON combos(profissional_id);
`;

// ─── DDL Clientes ────────────────────────────────────────────────────────────

const CREATE_CLIENTES = `
  CREATE TABLE IF NOT EXISTS clientes (
    id                      SERIAL PRIMARY KEY,
    nome                    VARCHAR(100) NOT NULL,
    contato                 VARCHAR(50),
    tipo                    VARCHAR(20)  NOT NULL DEFAULT 'regular',
    barbeiro_preferido_id   INTEGER REFERENCES profissionais(id) ON DELETE SET NULL,
    unidade                 unidade_enum,
    primeira_visita         DATE,
    ultima_visita           DATE,
    total_visitas           INTEGER NOT NULL DEFAULT 0,
    observacao              TEXT,
    ativo                   BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_clientes_nome    ON clientes(LOWER(nome));
  CREATE INDEX IF NOT EXISTS idx_clientes_unidade ON clientes(unidade);
`;

// ─── DDL Metas ───────────────────────────────────────────────────────────────

const CREATE_METAS = `
  CREATE TABLE IF NOT EXISTS metas (
    id                  SERIAL PRIMARY KEY,
    profissional_id     INTEGER REFERENCES profissionais(id) ON DELETE CASCADE,
    unidade             unidade_enum,
    tipo                VARCHAR(20) NOT NULL,
    periodo             VARCHAR(7)  NOT NULL,
    meta_bronze         NUMERIC(10,2),
    meta_prata          NUMERIC(10,2),
    meta_ouro           NUMERIC(10,2),
    bonificacao_bronze  NUMERIC(10,2),
    bonificacao_prata   NUMERIC(10,2),
    bonificacao_ouro    NUMERIC(10,2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_meta_prof_tipo_periodo UNIQUE (profissional_id, tipo, periodo)
  );
  CREATE INDEX IF NOT EXISTS idx_metas_periodo ON metas(periodo);
`;

// ─── DDL Metas por Unidade ───────────────────────────────────────────────────

const CREATE_CATALOGO = `
  CREATE TABLE IF NOT EXISTS catalogo (
    id                SERIAL PRIMARY KEY,
    nome              VARCHAR(120)  NOT NULL,
    categoria         VARCHAR(30)   NOT NULL DEFAULT 'servico',
    preco_venda       NUMERIC(10,2) NOT NULL DEFAULT 0,
    preco_custo       NUMERIC(10,2),
    quantidade        INTEGER       NOT NULL DEFAULT 0,
    quantidade_minima INTEGER       NOT NULL DEFAULT 0,
    unidade_medida    VARCHAR(20)   NOT NULL DEFAULT 'un',
    controla_estoque  BOOLEAN       NOT NULL DEFAULT false,
    ativo             BOOLEAN       NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_catalogo_nome UNIQUE (nome)
  );
`;

const SEED_CATALOGO = `
  INSERT INTO catalogo (nome, categoria, preco_venda, controla_estoque) VALUES
    ('Corte',                                             'servico', 45.00, false),
    ('Corte Infantil',                                    'servico', 45.00, false),
    ('Barba',                                             'servico', 35.00, false),
    ('Raspar Cabelo',                                     'servico', 30.00, false),
    ('Raspar Barba',                                      'servico', 20.00, false),
    ('Sobrancelha',                                       'servico', 15.00, false),
    ('Sobrancelha com Cera',                              'servico', 20.00, false),
    ('Depilação nariz',                                   'servico', 15.00, false),
    ('Depilação orelha',                                  'servico', 15.00, false),
    ('Depilação nariz + orelha',                          'servico', 30.00, false),
    ('Pezinho',                                           'servico', 15.00, false),
    ('Risco',                                             'servico',  5.00, false),
    ('Hidratação',                                        'servico', 25.00, false),
    ('Hidratação Barba',                                  'servico', 20.00, false),
    ('Selagem',                                           'servico', 57.00, false),
    ('Progressiva',                                       'servico', 79.00, false),
    ('Luzes',                                             'servico',123.50, false),
    ('Platinado',                                         'servico',197.50, false),
    ('Limpeza de pele (facial)',                          'servico', 40.00, false),
    ('Combo - Corte + Sobrancelha',                       'combo',   59.25, false),
    ('Combo - Corte + Barba',                             'combo',   79.00, false),
    ('Combo - Corte + Risco',                             'combo',   55.00, false),
    ('Combo - Corte + Sobrancelha com Cera',              'combo',   69.13, false),
    ('Combo - Corte + Barba + Sobrancelha',               'combo',   90.25, false),
    ('Combo - Corte + Barba + Risco',                     'combo',   88.88, false),
    ('Combo - Corte + Risco + Sobrancelha',               'combo',   69.13, false),
    ('Combo - Corte + Progressiva',                       'combo',  122.00, false),
    ('Combo Novo - 2 Cortes + 2 barbas + 2 sobrancelha',  'combo',  138.25, false),
    ('Combo Novo - 4 Barbas',                             'combo',  104.50, false),
    ('Combo Novo - 4 Cortes + 4 sobrancelha',             'combo',  167.88, false),
    ('Combo Novo - 4 Cortes + 4 barbas + 4 sobrancelha',  'combo',  286.05, false),
    ('Dia de Princeso (Corte + Barba + Sobrancelha + Limpeza de pele e Depilação)', 'combo', 138.25, false),
    ('Pomada Pistache - Fox',    'produto_capilar',  22.71, true),
    ('Pomada - Fox',             'produto_capilar',  24.69, true),
    ('Pomada em Pó - Fox',       'produto_capilar',  39.50, true),
    ('Shampoo 3 em 1 - Match',   'produto_capilar',  42.46, true),
    ('Shampoo 4 em 1 - Fox',     'produto_capilar',  42.75, true),
    ('Shampoo Ice - Fox',        'produto_capilar',  39.50, true),
    ('Shampoo para Barba - Fox', 'produto_capilar',  38.00, true),
    ('Shampoo White - Fox',      'produto_capilar',  54.31, true),
    ('Condicionador Ice - Fox',  'produto_capilar',  39.50, true),
    ('Leave-in',                 'produto_capilar',  52.25, true),
    ('Balm - Match',             'produto_capilar',  42.46, true),
    ('Óleo Spray',               'produto_capilar',  39.50, true),
    ('Óleo Gota - Fox',          'produto_capilar',  41.00, true),
    ('Óleo Gota - Match',        'produto_capilar',  43.00, true),
    ('Pente de Madeira (Barba)', 'produto_capilar',  22.71, true),
    ('Pente Garfo',              'produto_capilar',  30.00, true),
    ('Minoxidil',                'produto_capilar',  98.75, true),
    ('Cerveja Heineken',         'bebida',           11.00, true),
    ('Cerveja - Petra',          'bebida',            5.00, true),
    ('Cerveja - Amstel',         'bebida',           14.00, true),
    ('Coca Cola 350ml',          'bebida',            7.60, true),
    ('Guaraná',                  'bebida',            8.00, true),
    ('Suco',                     'bebida',            6.91, true),
    ('Salgadinho Fofura',        'snack',             3.95, true),
    ('Salgadinho Torcida',       'snack',             3.95, true),
    ('Salgadinho Bacon',         'snack',             9.88, true),
    ('Doce de Amendoim',         'snack',             4.00, true),
    ('Doce Cocada',              'snack',             4.00, true),
    ('Pipoca',                   'snack',             7.90, true),
    ('Cueca',                    'vestuario',        33.00, true),
    ('Meia Infantil',            'vestuario',        12.00, true)
  ON CONFLICT (nome) DO NOTHING;
`;

const CREATE_METAS_UNIDADE = `
  CREATE TABLE IF NOT EXISTS metas_unidade (
    id               SERIAL PRIMARY KEY,
    unidade          unidade_enum NOT NULL,
    mes              SMALLINT NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano              SMALLINT NOT NULL,
    valor_global     NUMERIC(10,2) NOT NULL,
    piso_bronze      NUMERIC(10,2),
    comissao_bronze  NUMERIC(5,2),
    piso_prata       NUMERIC(10,2),
    comissao_prata   NUMERIC(5,2),
    piso_ouro        NUMERIC(10,2),
    comissao_ouro    NUMERIC(5,2),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_meta_unidade_periodo UNIQUE (unidade, mes, ano)
  );
`;

// ─── DDL Usuários (RBAC) ────────────────────────────────────────────────────

const CREATE_USUARIOS = `
  DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('admin', 'barbeiro');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  CREATE TABLE IF NOT EXISTS usuarios (
    id               SERIAL PRIMARY KEY,
    nome             VARCHAR(100) NOT NULL,
    username         VARCHAR(50)  NOT NULL,
    senha_hash       VARCHAR(255) NOT NULL,
    role             user_role_enum NOT NULL DEFAULT 'barbeiro',
    profissional_id  INTEGER REFERENCES profissionais(id) ON DELETE SET NULL,
    ativo            BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_username UNIQUE (username)
  );
`;

// Adiciona role 'operador' e coluna unidade_acesso (idempotente)
const ALTER_USER_ROLE_OPERADOR = `
  ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'operador';
`;

const ALTER_USUARIOS_UNIDADE_ACESSO = `
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS unidade_acesso VARCHAR(20);
`;

// Senhas padrão — ALTERAR em produção via UPDATE usuarios SET senha_hash = ...
async function seedUsuarios() {
  const bcrypt = require('bcryptjs');

  const { rows: profs } = await query('SELECT id, nome FROM profissionais');
  const findId = (fragment) =>
    fragment
      ? profs.find((p) => p.nome.toLowerCase().includes(fragment.toLowerCase()))?.id ?? null
      : null;

  const seeds = [
    { nome: 'Thieco Leandro', username: 'thieco',  senha: 'Thieco@2025!',  role: 'admin',    profKey: 'thieco', unidade_acesso: null      },
    { nome: 'Caixa Mutinga',  username: 'mutinga', senha: 'Mutinga@2025!', role: 'operador', profKey: null,     unidade_acesso: 'mutinga' },
  ];

  for (const u of seeds) {
    const { rows: exists } = await query('SELECT id FROM usuarios WHERE username = $1', [u.username]);
    if (exists.length > 0) continue;

    const hash = await bcrypt.hash(u.senha, 12);
    await query(
      `INSERT INTO usuarios (nome, username, senha_hash, role, profissional_id, unidade_acesso)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (username) DO NOTHING`,
      [u.nome, u.username, hash, u.role, findId(u.profKey), u.unidade_acesso]
    );
  }
  console.log('  ✓ Usuários verificados: thieco (admin), mutinga (operador)');
}

// ─── Migrations ─────────────────────────────────────────────────────────────

async function runMigrations() {
  console.log('Executando migrations...');
  try {
    await query(CREATE_ENUM_UNIDADE);
    await query(CREATE_PROFISSIONAIS);
    await query(ADD_UNIQUE_PROF_NOME);
    await query(CREATE_VENDAS);
    await query(CREATE_GASTOS);
    await query(SEED_PROFISSIONAIS);
    await query(CREATE_FEEDBACKS);
    await query(CREATE_PLANOS_ACAO);
    await query(CREATE_SUGESTOES);
    await query(CREATE_USUARIOS);
    await query(ALTER_USER_ROLE_OPERADOR);
    await query(ALTER_USUARIOS_UNIDADE_ACESSO);
    await query(ALTER_VENDAS_NOVOS_CAMPOS);
    await query(ALTER_GASTOS_VALOR_PREVISTO);
    await query(CREATE_COMBOS);
    await query(CREATE_CLIENTES);
    await query(CREATE_METAS);
    await query(CREATE_METAS_UNIDADE);
    await query(CREATE_CATALOGO);
    await query(SEED_CATALOGO);
    await seedUsuarios();
    console.log('Migrations concluídas com sucesso.');
  } catch (err) {
    console.error('Erro ao executar migrations:', err.message);
    throw err;
  }
}

// ─── Queries reutilizáveis ───────────────────────────────────────────────────

const Profissional = {
  findAll: ({ unidade, apenas_barbeiros } = {}) => {
    const conditions = ['p.ativo = true'];
    const params = [];
    if (unidade) {
      params.push(unidade);
      conditions.push(`p.unidade = $${params.length}`);
    }
    if (apenas_barbeiros) {
      conditions.push(
        `NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.profissional_id = p.id AND u.role = 'admin')`
      );
    }
    return query(
      `SELECT p.* FROM profissionais p WHERE ${conditions.join(' AND ')} ORDER BY p.nome`,
      params
    );
  },
  findById: (id) => query(`SELECT * FROM profissionais WHERE id = $1`, [id]),
  findByNome: (nome) =>
    query(`SELECT * FROM profissionais WHERE LOWER(nome) = LOWER($1) LIMIT 1`, [nome]),
  create: ({ nome, unidade, percentual_comissao }) =>
    query(
      `INSERT INTO profissionais (nome, unidade, percentual_comissao)
       VALUES ($1, $2, $3) RETURNING *`,
      [nome, unidade, percentual_comissao ?? 40]
    ),
};

const Venda = {
  findAll: ({ unidade, inicio, fim, profissional_id } = {}) => {
    const conditions = [];
    const params = [];
    if (unidade) { conditions.push(`v.unidade = $${params.push(unidade)}`); }
    if (inicio)  { conditions.push(`v.data >= $${params.push(inicio)}`); }
    if (fim)     { conditions.push(`v.data <= $${params.push(fim)}`); }
    if (profissional_id) { conditions.push(`v.profissional_id = $${params.push(profissional_id)}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return query(
      `SELECT v.*, p.nome AS profissional_nome
       FROM vendas v
       LEFT JOIN profissionais p ON p.id = v.profissional_id
       ${where}
       ORDER BY v.data DESC, v.created_at DESC`,
      params
    );
  },
  create: ({ unidade, profissional_id, servico, valor, comissao, forma_pagamento, data, observacao, importado,
             desconto, tipo_cliente, upsell, venda_origem_id, qtd_clientes }) =>
    query(
      `INSERT INTO vendas (unidade, profissional_id, servico, valor, comissao, forma_pagamento, data, observacao, importado,
                           desconto, tipo_cliente, upsell, venda_origem_id, qtd_clientes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [unidade, profissional_id, servico, valor, comissao ?? 0, forma_pagamento ?? 'dinheiro', data,
       observacao ?? null, importado ?? false,
       desconto ?? 0, tipo_cliente ?? 'agendado', upsell ?? false, venda_origem_id ?? null, qtd_clientes ?? 1]
    ),
  bulkCreate: async (vendas) => {
    const client = await require('./db').getClient();
    try {
      await client.query('BEGIN');
      const inserted = [];
      for (const v of vendas) {
        const { rows } = await client.query(
          `INSERT INTO vendas (unidade, profissional_id, servico, valor, comissao, forma_pagamento, data, observacao, importado)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8, true) RETURNING *`,
          [v.unidade, v.profissional_id, v.servico, v.valor, v.comissao ?? 0, v.forma_pagamento ?? 'dinheiro', v.data, v.observacao ?? null]
        );
        inserted.push(rows[0]);
      }
      await client.query('COMMIT');
      return inserted;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

const Gasto = {
  findAll: ({ unidade, inicio, fim, categoria } = {}) => {
    const conditions = [];
    const params = [];
    if (unidade)   { conditions.push(`unidade = $${params.push(unidade)}`); }
    if (inicio)    { conditions.push(`data >= $${params.push(inicio)}`); }
    if (fim)       { conditions.push(`data <= $${params.push(fim)}`); }
    if (categoria) { conditions.push(`LOWER(categoria) = LOWER($${params.push(categoria)})`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return query(`SELECT * FROM gastos ${where} ORDER BY data DESC, created_at DESC`, params);
  },
  create: ({ unidade, categoria, descricao, valor, data, observacao, importado, valor_previsto }) =>
    query(
      `INSERT INTO gastos (unidade, categoria, descricao, valor, data, observacao, importado, valor_previsto)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [unidade, categoria, descricao, valor, data, observacao ?? null, importado ?? false, valor_previsto ?? null]
    ),
  bulkCreate: async (gastos) => {
    const client = await require('./db').getClient();
    try {
      await client.query('BEGIN');
      const inserted = [];
      for (const g of gastos) {
        const { rows } = await client.query(
          `INSERT INTO gastos (unidade, categoria, descricao, valor, data, observacao, importado)
           VALUES ($1,$2,$3,$4,$5,$6, true) RETURNING *`,
          [g.unidade, g.categoria, g.descricao, g.valor, g.data, g.observacao ?? null]
        );
        inserted.push(rows[0]);
      }
      await client.query('COMMIT');
      return inserted;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

const Combo = {
  findAll: ({ unidade, apenas_vencidos, profissional_id } = {}) => {
    const conditions = ['c.ativo = true'];
    const params = [];
    if (unidade) { conditions.push(`c.unidade = $${params.push(unidade)}`); }
    if (profissional_id) { conditions.push(`c.profissional_id = $${params.push(profissional_id)}`); }
    if (apenas_vencidos) { conditions.push(`c.data_vencimento < CURRENT_DATE`); }
    return query(
      `SELECT c.*, p.nome AS profissional_nome
       FROM combos c LEFT JOIN profissionais p ON p.id = c.profissional_id
       WHERE ${conditions.join(' AND ')} ORDER BY c.data_vencimento ASC`,
      params
    );
  },
  create: ({ cliente_nome, cliente_contato, profissional_id, unidade, data_aquisicao, data_vencimento, servicos, valor }) =>
    query(
      `INSERT INTO combos (cliente_nome, cliente_contato, profissional_id, unidade, data_aquisicao, data_vencimento, servicos, valor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [cliente_nome, cliente_contato ?? null, profissional_id ?? null, unidade, data_aquisicao, data_vencimento, servicos, valor]
    ),
  update: (id, fields) => {
    const sets = Object.keys(fields).map((k, i) => `${k} = $${i + 2}`).join(', ');
    return query(`UPDATE combos SET ${sets} WHERE id = $1 RETURNING *`, [id, ...Object.values(fields)]);
  },
};

const Cliente = {
  findAll: ({ unidade, busca, tipo } = {}) => {
    const conditions = ['c.ativo = true'];
    const params = [];
    if (unidade) { conditions.push(`c.unidade = $${params.push(unidade)}`); }
    if (tipo)    { conditions.push(`c.tipo = $${params.push(tipo)}`); }
    if (busca)   { conditions.push(`LOWER(c.nome) LIKE LOWER($${params.push('%' + busca + '%')})`); }
    return query(
      `SELECT c.*, p.nome AS barbeiro_preferido_nome
       FROM clientes c LEFT JOIN profissionais p ON p.id = c.barbeiro_preferido_id
       WHERE ${conditions.join(' AND ')} ORDER BY c.nome`,
      params
    );
  },
  findById: (id) => query(`SELECT * FROM clientes WHERE id = $1`, [id]),
  create: ({ nome, contato, tipo, barbeiro_preferido_id, unidade, primeira_visita, observacao }) =>
    query(
      `INSERT INTO clientes (nome, contato, tipo, barbeiro_preferido_id, unidade, primeira_visita, ultima_visita)
       VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
      [nome, contato ?? null, tipo ?? 'regular', barbeiro_preferido_id ?? null, unidade ?? null, primeira_visita ?? null]
    ),
  update: (id, fields) => {
    const sets = Object.keys(fields).map((k, i) => `${k} = $${i + 2}`).join(', ');
    return query(`UPDATE clientes SET ${sets} WHERE id = $1 RETURNING *`, [id, ...Object.values(fields)]);
  },
};

const Meta = {
  findAll: ({ profissional_id, periodo, unidade } = {}) => {
    const conditions = [];
    const params = [];
    if (profissional_id) { conditions.push(`m.profissional_id = $${params.push(profissional_id)}`); }
    if (periodo)         { conditions.push(`m.periodo = $${params.push(periodo)}`); }
    if (unidade)         { conditions.push(`m.unidade = $${params.push(unidade)}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return query(
      `SELECT m.*, p.nome AS profissional_nome
       FROM metas m LEFT JOIN profissionais p ON p.id = m.profissional_id
       ${where} ORDER BY m.periodo DESC, p.nome`,
      params
    );
  },
  upsert: ({ profissional_id, unidade, tipo, periodo, meta_bronze, meta_prata, meta_ouro, bonificacao_bronze, bonificacao_prata, bonificacao_ouro }) =>
    query(
      `INSERT INTO metas (profissional_id, unidade, tipo, periodo, meta_bronze, meta_prata, meta_ouro, bonificacao_bronze, bonificacao_prata, bonificacao_ouro)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (profissional_id, tipo, periodo) DO UPDATE SET
         meta_bronze = EXCLUDED.meta_bronze, meta_prata = EXCLUDED.meta_prata, meta_ouro = EXCLUDED.meta_ouro,
         bonificacao_bronze = EXCLUDED.bonificacao_bronze, bonificacao_prata = EXCLUDED.bonificacao_prata, bonificacao_ouro = EXCLUDED.bonificacao_ouro
       RETURNING *`,
      [profissional_id ?? null, unidade ?? null, tipo, periodo, meta_bronze ?? null, meta_prata ?? null, meta_ouro ?? null,
       bonificacao_bronze ?? null, bonificacao_prata ?? null, bonificacao_ouro ?? null]
    ),
};

const MetaUnidade = {
  findAll: ({ unidade, mes, ano } = {}) => {
    const conditions = [];
    const params = [];
    if (unidade) { conditions.push(`unidade = $${params.push(unidade)}`); }
    if (mes)     { conditions.push(`mes = $${params.push(Number(mes))}`); }
    if (ano)     { conditions.push(`ano = $${params.push(Number(ano))}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return query(`SELECT * FROM metas_unidade ${where} ORDER BY ano DESC, mes DESC`, params);
  },
  upsert: ({ unidade, mes, ano, valor_global, piso_bronze, comissao_bronze, piso_prata, comissao_prata, piso_ouro, comissao_ouro }) =>
    query(
      `INSERT INTO metas_unidade (unidade, mes, ano, valor_global, piso_bronze, comissao_bronze, piso_prata, comissao_prata, piso_ouro, comissao_ouro)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (unidade, mes, ano) DO UPDATE SET
         valor_global = EXCLUDED.valor_global,
         piso_bronze = EXCLUDED.piso_bronze, comissao_bronze = EXCLUDED.comissao_bronze,
         piso_prata = EXCLUDED.piso_prata, comissao_prata = EXCLUDED.comissao_prata,
         piso_ouro = EXCLUDED.piso_ouro, comissao_ouro = EXCLUDED.comissao_ouro
       RETURNING *`,
      [unidade, Number(mes), Number(ano), valor_global,
       piso_bronze ?? null, comissao_bronze ?? null,
       piso_prata ?? null, comissao_prata ?? null,
       piso_ouro ?? null, comissao_ouro ?? null]
    ),
};

const Catalogo = {
  findAll: ({ categoria, controla_estoque, ativo = true } = {}) => {
    const conditions = [];
    const params = [];
    if (ativo !== undefined) conditions.push(`ativo = $${params.push(ativo)}`);
    if (categoria) conditions.push(`categoria = $${params.push(categoria)}`);
    if (controla_estoque !== undefined) conditions.push(`controla_estoque = $${params.push(controla_estoque === 'true' || controla_estoque === true)}`);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return query(
      `SELECT * FROM catalogo ${where} ORDER BY categoria, nome`,
      params
    );
  },
  findById: (id) => query(`SELECT * FROM catalogo WHERE id = $1`, [id]),
  create: ({ nome, categoria, preco_venda, preco_custo, quantidade, quantidade_minima, unidade_medida, controla_estoque }) =>
    query(
      `INSERT INTO catalogo (nome, categoria, preco_venda, preco_custo, quantidade, quantidade_minima, unidade_medida, controla_estoque)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nome, categoria ?? 'servico', preco_venda ?? 0, preco_custo ?? null,
       quantidade ?? 0, quantidade_minima ?? 0, unidade_medida ?? 'un', controla_estoque ?? false]
    ),
  update: (id, fields) => {
    const sets = [];
    const params = [];
    const allowed = ['nome','categoria','preco_venda','preco_custo','quantidade','quantidade_minima','unidade_medida','controla_estoque','ativo'];
    allowed.forEach(k => {
      if (fields[k] !== undefined) sets.push(`${k} = $${params.push(fields[k])}`);
    });
    if (!sets.length) return Promise.resolve({ rows: [] });
    params.push(id);
    return query(`UPDATE catalogo SET ${sets.join(',')} WHERE id = $${params.length} RETURNING *`, params);
  },
  ajustarQuantidade: (id, delta) =>
    query(`UPDATE catalogo SET quantidade = GREATEST(0, quantidade + $1) WHERE id = $2 RETURNING *`, [delta, id]),
};

module.exports = { runMigrations, Profissional, Venda, Gasto, Combo, Cliente, Meta, MetaUnidade, Catalogo };
