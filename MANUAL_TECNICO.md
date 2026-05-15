# Manual Técnico — Sistema Barbearia Thieco Leandro

> Versão: maio/2026 · Branch: `main` · Repositório: `willianslegacy94-zion/sistema-thieco`

---

## Sumário

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Variáveis de Ambiente](#2-variáveis-de-ambiente)
3. [Subir / Parar o Sistema](#3-subir--parar-o-sistema)
4. [Esquema do Banco de Dados](#4-esquema-do-banco-de-dados)
5. [Autenticação e Papéis](#5-autenticação-e-papéis)
6. [API — Endpoints](#6-api--endpoints)
7. [Frontend — Estrutura de Arquivos](#7-frontend--estrutura-de-arquivos)
8. [Fluxo de Dados — Venda](#8-fluxo-de-dados--venda)
9. [Taxas PagBank e Cálculo de DRE](#9-taxas-pagbank-e-cálculo-de-dre)
10. [Backup e Restore do Banco](#10-backup-e-restore-do-banco)
11. [Troubleshooting](#11-troubleshooting)
12. [Decisões Técnicas Relevantes](#12-decisões-técnicas-relevantes)

---

## 1. Visão Geral da Arquitetura

```
Navegador
    │  HTTP :5173
    ▼
┌─────────────────────────────────────────┐
│  thieco_web  (Nginx — porta 80)         │
│  React SPA (Vite build estático)        │
│  /api/* → proxy reverso para backend   │
└─────────────────────────────────────────┘
    │  HTTP :3001 (rede interna Docker)
    ▼
┌─────────────────────────────────────────┐
│  thieco_api  (Node.js / Express)        │
│  JWT auth · express-validator           │
│  Migrations na inicialização            │
└─────────────────────────────────────────┘
    │  PostgreSQL driver (pg)
    ▼
┌─────────────────────────────────────────┐
│  thieco_db  (PostgreSQL 16-alpine)      │
│  Volume: thieco_postgres_data           │
│  Encoding: UTF-8, locale pt_BR         │
└─────────────────────────────────────────┘
```

**Portas expostas no host:**

| Serviço | Porta host | Porta interna |
|---|---|---|
| Frontend (Nginx) | 5173 | 80 |
| PostgreSQL | 5432 | 5432 |
| Backend | não exposto | 3001 |

O backend não é exposto diretamente; o Nginx faz proxy reverso de `/api/*` para `thieco_api:3001`.

---

## 2. Variáveis de Ambiente

Arquivo `.env` na raiz do projeto (não versionar com dados reais):

| Variável | Descrição | Exemplo |
|---|---|---|
| `DB_NAME` | Nome do banco | `sistema_thieco` |
| `DB_USER` | Usuário PostgreSQL | `postgres` |
| `DB_PASSWORD` | Senha PostgreSQL | `Thieco2025!` |
| `JWT_SECRET` | Chave de assinatura JWT | string longa e aleatória |
| `JWT_EXPIRES_IN` | Expiração do token | `8h` |
| `ADMIN_PIN` | PIN numérico admin (legado) | `2121` |

> O `ADMIN_PIN` existe por compatibilidade histórica. O controle de acesso principal usa JWT com campo `role`.

---

## 3. Subir / Parar o Sistema

### Primeira vez

```bash
cp .env.example .env          # preencher senhas
docker compose up -d          # sobe tudo (inclui migrations automáticas)
```

### Operações do dia a dia

```bash
# Subir
docker compose up -d

# Parar (preserva dados)
docker compose down

# Ver logs em tempo real
docker compose logs -f

# Logs de um serviço específico
docker compose logs -f backend
docker compose logs -f postgres

# Status dos containers
docker compose ps
```

### Rebuild após atualização de código

```bash
git pull origin main

# Rebuild sem cache (use quando houver mudanças no package.json ou Dockerfile)
docker compose build --no-cache backend
docker compose build --no-cache frontend

# Rebuild com cache (mudanças apenas de código)
docker compose build backend
docker compose build frontend

# Subir com rebuild
docker compose up -d --build
```

### Reiniciar um serviço específico

```bash
docker compose restart backend
docker compose restart frontend
```

---

## 4. Esquema do Banco de Dados

As migrations são executadas automaticamente pelo backend na inicialização (`backend/models.js → runMigrations`). São idempotentes: usam `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`.

### ENUMs PostgreSQL

| Tipo | Valores |
|---|---|
| `unidade_enum` | `tambore`, `mutinga` |
| `user_role_enum` | `admin`, `barbeiro`, `operador` |
| `feedback_tipo_enum` | `elogio`, `melhoria` |
| `pdca_status_enum` | `pendente`, `em_andamento`, `concluido`, `cancelado` |
| `sugestao_status_enum` | `aberta`, `em_analise`, `aprovada`, `implementada`, `rejeitada` |
| `sugestao_prioridade_enum` | `baixa`, `media`, `alta` |

### Tabela `profissionais`

| Coluna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| nome | VARCHAR(100) | UNIQUE (constraint `uq_prof_nome`) |
| unidade | unidade_enum NOT NULL | |
| percentual_comissao | NUMERIC(5,2) | default 40.00 |
| ativo | BOOLEAN | default true — soft delete |
| created_at | TIMESTAMPTZ | |

Barbeiros inativos (`ativo = false`) são excluídos dos seletores de venda, do ranking e dos relatórios, mas suas vendas históricas são preservadas.

### Tabela `vendas`

| Coluna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| unidade | unidade_enum NOT NULL | |
| profissional_id | INTEGER FK | `ON DELETE SET NULL` — preserva venda ao excluir barbeiro |
| servico | VARCHAR(120) | |
| valor | NUMERIC(10,2) | ≥ 0 |
| comissao | NUMERIC(10,2) | calculado no backend |
| forma_pagamento | VARCHAR(30) | dinheiro/pix/debito/credito/cortesia |
| data | DATE NOT NULL | |
| desconto | NUMERIC(10,2) | default 0 |
| tipo_cliente | VARCHAR(20) | agendado/walkin/retorno/indicacao |
| upsell | BOOLEAN | se originou de combo |
| venda_origem_id | INTEGER FK | referência à venda-combo original |
| qtd_clientes | SMALLINT | default 1 |
| nome_cliente | VARCHAR(120) | opcional |
| origem_cliente | VARCHAR(30) | Instagram, Google… |
| bandeira_cartao | VARCHAR(30) | para débito/crédito |
| valor_liquido | NUMERIC(10,2) | após taxa PagBank |
| importado | BOOLEAN | true = veio de planilha |
| observacao | TEXT | |
| created_at | TIMESTAMPTZ | |

**Índices:** `idx_vendas_data`, `idx_vendas_unidade`, `idx_vendas_profissional`

### Tabela `gastos`

| Coluna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| unidade | unidade_enum NOT NULL | |
| categoria | VARCHAR(60) | aluguel/produto/manutenção/salário… |
| descricao | VARCHAR(255) | |
| valor | NUMERIC(10,2) | ≥ 0 |
| valor_previsto | NUMERIC(10,2) | opcional, para orçamento |
| data | DATE | |
| importado | BOOLEAN | |
| observacao | TEXT | |
| created_at | TIMESTAMPTZ | |

### Tabela `usuarios`

| Coluna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| nome | VARCHAR(100) | |
| username | VARCHAR(50) | UNIQUE |
| senha_hash | VARCHAR(255) | bcrypt rounds=12 |
| role | user_role_enum | admin/barbeiro/operador |
| profissional_id | INTEGER FK | `ON DELETE SET NULL` |
| unidade_acesso | VARCHAR(20) | para operadores: tambore/mutinga |
| ativo | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

### Tabela `combos`

| Coluna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| cliente_nome | VARCHAR(100) | |
| cliente_contato | VARCHAR(50) | |
| profissional_id | INTEGER FK | `ON DELETE SET NULL` |
| unidade | unidade_enum | |
| data_aquisicao | DATE | |
| data_vencimento | DATE | |
| servicos | TEXT | lista de serviços incluídos |
| valor | NUMERIC(10,2) | |
| ativo | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

### Tabela `clientes`

| Coluna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| nome | VARCHAR(100) | |
| contato | VARCHAR(50) | |
| tipo | VARCHAR(20) | regular/vip/inativo |
| barbeiro_preferido_id | INTEGER FK | `ON DELETE SET NULL` |
| unidade | unidade_enum | |
| primeira_visita | DATE | |
| ultima_visita | DATE | |
| total_visitas | INTEGER | |
| observacao | TEXT | |
| ativo | BOOLEAN | |

### Tabela `metas`

Metas individuais por barbeiro. Constraint UNIQUE em `(profissional_id, tipo, periodo)`.

| Coluna | Tipo |
|---|---|
| profissional_id | INTEGER FK |
| unidade | unidade_enum |
| tipo | VARCHAR(20) |
| periodo | VARCHAR(7) — `YYYY-MM` |
| meta_bronze / prata / ouro | NUMERIC(10,2) |
| bonificacao_bronze / prata / ouro | NUMERIC(10,2) |

### Tabela `metas_unidade`

Meta global da unidade por mês/ano. Constraint UNIQUE em `(unidade, mes, ano)`.

### Tabela `catalogo`

Serviços, combos e produtos. Índice UNIQUE em `(nome, COALESCE(unidade, ''))` para permitir mesmo nome em unidades diferentes.

| Coluna | Tipo | Notas |
|---|---|---|
| categoria | VARCHAR(30) | servico/combo/produto_capilar/bebida/snack/vestuario |
| preco_venda | NUMERIC(10,2) | |
| preco_custo | NUMERIC(10,2) | |
| quantidade | INTEGER | estoque atual |
| quantidade_minima | INTEGER | alerta de estoque baixo |
| controla_estoque | BOOLEAN | |
| unidade | VARCHAR(20) | NULL = compartilhado entre unidades |

### Tabelas de Gestão de Time

- **`feedbacks`** — elogio/melhoria por barbeiro, com tipo, categoria, título, descrição
- **`planos_acao`** — ciclo PDCA por barbeiro, com status e datas
- **`sugestoes`** — sugestões por unidade, com prioridade e status
- **`configuracoes`** — pares chave/valor do sistema (taxas PagBank etc.)

---

## 5. Autenticação e Papéis

### Login

`POST /api/auth/login` — retorna JWT. O token é salvo em `localStorage` com a chave `thieco_auth_token`.

### Payload do JWT

```json
{
  "id": 1,
  "username": "thieco",
  "nome": "Thieco Leandro",
  "role": "admin",
  "unidade": "tambore",
  "profissional_id": 1
}
```

Para operadores, `role = "operador"` e `unidade` corresponde à unidade de acesso configurada.

### Middlewares (`backend/middleware/auth.js`)

| Middleware | Comportamento |
|---|---|
| `authenticate` | Valida Bearer token, injeta `req.user` |
| `requireAdmin` | Retorna 403 se `req.user.role !== 'admin'` |

### Resolução de unidade nas rotas protegidas

Padrão adotado em `vendas.js` e `combos.js`:

```js
const unidade = req.user.role === 'operador'
  ? req.user.unidade
  : (req.body.unidade ?? req.user.unidade);
```

Operadores têm unidade fixada no JWT. Admins podem enviar `unidade` no body ou usar a própria como fallback.

---

## 6. API — Endpoints

Base: `/api`

### Autenticação

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/login` | público | Login — retorna `{ token, user }` |
| GET | `/auth/me` | autenticado | Dados do usuário atual |

### Profissionais

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/profissionais` | público | Apenas ativos (seletores de venda) |
| GET | `/profissionais/admin` | admin | Todos incluindo inativos |
| POST | `/profissionais` | público | Criar profissional |
| PATCH | `/profissionais/:id/ativo` | admin | Ativar/inativar barbeiro |

### Vendas

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/vendas` | autenticado | Listar (filtros: unidade, inicio, fim, profissional_id) |
| POST | `/vendas` | autenticado | Criar venda |
| PUT | `/vendas/:id` | autenticado | Atualizar venda |
| DELETE | `/vendas/:id` | autenticado | Excluir venda |

### Gastos

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/gastos` | autenticado | Listar (filtros: unidade, inicio, fim, categoria) |
| POST | `/gastos` | autenticado | Criar gasto |
| PUT | `/gastos/:id` | autenticado | Atualizar gasto |
| DELETE | `/gastos/:id` | autenticado | Excluir gasto |

### Relatórios

Todos requerem autenticação. Filtros: `inicio`, `fim`, `unidade` (opcionais).

| Rota | Descrição |
|---|---|
| `/relatorios/fluxo-caixa` | Receitas e despesas por período |
| `/relatorios/dre` | Demonstração de resultado |
| `/relatorios/comissoes` | Comissões por barbeiro |
| `/relatorios/inteligencia` | Análise de serviços, horários, ticket médio |
| `/relatorios/resumo-operador` | Visão do operador (própria unidade) |

### Combos

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/combos` | autenticado | Listar combos ativos |
| POST | `/combos` | autenticado | Criar combo |
| PATCH | `/combos/:id` | autenticado | Atualizar combo |
| GET | `/combos/buscar` | autenticado | Busca por nome de cliente |
| POST | `/combos/uso` | autenticado | Registrar uso de sessão |
| POST | `/combos/ativar` | autenticado | Ativar novo combo com venda |

### Clientes, Metas, Catálogo

Padrão REST sobre `/clientes`, `/metas`, `/metas-unidade`, `/catalogo`.

### Gestão de Time

Todos requerem `authenticate`.

| Rota | Descrição |
|---|---|
| GET/POST `/gestao/feedbacks` | Listar / criar feedbacks |
| DELETE `/gestao/feedbacks/:id` | Excluir feedback |
| GET/POST `/gestao/pdca` | Listar / criar planos PDCA |
| PUT `/gestao/pdca/:id` | Atualizar plano |
| DELETE `/gestao/pdca/:id` | Excluir plano |
| GET/POST `/gestao/sugestoes` | Listar / criar sugestões |
| PUT `/gestao/sugestoes/:id` | Atualizar sugestão |
| GET `/gestao/timeline/:profissionalId` | Timeline de feedbacks e planos do barbeiro |

### Importação e Health

| Rota | Descrição |
|---|---|
| POST `/import` | Importação em lote (admin) |
| GET `/health` | Healthcheck — retorna `{ status: 'ok' }` |

---

## 7. Frontend — Estrutura de Arquivos

```
frontend/src/
├── components/
│   ├── Dashboard.jsx          # DashboardAdmin + DashboardBarbeiro
│   ├── FilterBar.jsx          # Filtros de período e unidade (bufferiza estado local para datas)
│   └── gestao/
│       ├── FeedbackForm.jsx / FeedbackList.jsx
│       ├── PdcaForm.jsx / PdcaCard.jsx
│       ├── SugestaoForm.jsx / SugestaoList.jsx
│       └── TimelineBarbeiro.jsx
├── contexts/
│   └── AuthContext.jsx        # JWT decode, login/logout, proteção de rotas
├── hooks/
│   ├── useBarbeariaData.js    # SWR: polling 3s, keepPreviousData, isValidDate
│   ├── useGestao.js           # Estado e chamadas API para Gestão de Time
│   └── useInvalidarDashboard.js  # Invalida cache SWR após mutações
├── lib/
│   └── api.js                 # Cliente HTTP (fetch + Bearer token automático)
└── pages/
    ├── Login.jsx
    ├── RegistroVenda.jsx      # Abas: Venda / Combos
    ├── GestaoTime.jsx         # Abas: Equipe / Feedbacks / PDCA / Sugestões / Timeline
    └── ...
```

### Comportamento do SWR

Configurado em `useBarbeariaData.js`:

```js
const SWR_OPTS = {
  refreshInterval: 3000,      // polling a cada 3 segundos
  keepPreviousData: true,      // não pisca ao atualizar
  dedupingInterval: 2000,      // deduplicação de requests
};
```

As chaves SWR ficam `null` enquanto as datas são inválidas, suspendendo o fetch.

### Buffering de datas no FilterBar

O `FilterBar` mantém estado local (`localInicio`, `localFim`) e só propaga para o estado pai quando `isValidDate(v)` retorna `true`. Isso evita re-renders do dashboard inteiro a cada keystroke durante digitação manual de datas.

---

## 8. Fluxo de Dados — Venda

```
Usuário preenche formulário (RegistroVenda.jsx)
  ↓
AbaVenda.onSubmit():
  - Encontra o barbeiro selecionado na lista
  - Extrai barbeiro.unidade como unidade da venda
  - Calcula comissao = valor * (percentual_comissao / 100)
  - Monta payload com { unidade, profissional_id, servico, valor, comissao, ... }
  ↓
api.criarVenda(payload) → POST /api/vendas
  ↓
Backend (vendas.js):
  - authenticate → req.user injetado
  - express-validator valida campos
  - Resolve unidade: operador usa JWT, admin usa body ?? JWT
  - Venda.create() → INSERT INTO vendas
  ↓
useInvalidarDashboard() invalida cache SWR → Dashboard recarrega
```

---

## 9. Taxas PagBank e Cálculo de DRE

As taxas ficam na tabela `configuracoes`:

| Chave | Valor | Forma |
|---|---|---|
| `taxa_debito` | `0.0119` | Débito (Visa/Master/Elo) |
| `taxa_credito` | `0.0349` | Crédito à vista |
| `taxa_pix` | `0` | Pix |
| `taxa_dinheiro` | `0` | Dinheiro |
| `taxa_cortesia` | `0` | Cortesia |

O endpoint `/relatorios/dre` aplica as taxas sobre o valor de cada venda para calcular:

```
Faturamento Bruto
  - Taxas maquininha (taxa × valor por forma de pagamento)
= Faturamento Líquido (após PagBank)
  - Comissões dos barbeiros
  - Gastos do período
= Lucro Operacional
```

Para atualizar as taxas, execute no banco:

```sql
UPDATE configuracoes SET valor = '0.0139' WHERE chave = 'taxa_debito';
```

---

## 10. Backup e Restore do Banco

### Backup manual

```bash
docker exec thieco_db pg_dump -U postgres sistema_thieco > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
docker exec -i thieco_db psql -U postgres sistema_thieco < backup_20260514.sql
```

### Acesso direto ao banco (DBeaver / psql)

```
Host: localhost
Port: 5432
Database: sistema_thieco
User: postgres
Password: (ver .env → DB_PASSWORD)
```

Via terminal:

```bash
docker exec -it thieco_db psql -U postgres sistema_thieco
```

---

## 11. Troubleshooting

### Container não sobe / fica em "starting"

```bash
docker compose logs postgres   # ver erro de inicialização do banco
docker compose logs backend    # ver erro de migration ou conexão
```

Causas comuns:
- `.env` não existe ou tem senha errada
- Volume corrompido: `docker compose down -v` (APAGA dados) + `docker compose up -d`

### Backend retorna 422 ao registrar venda

Verificar:
1. O barbeiro selecionado tem `unidade` preenchida?
2. O campo `forma_pagamento` é um dos valores válidos?
3. A data está no formato `YYYY-MM-DD`?

Inspecionar no log:

```bash
docker compose logs backend | grep "422\|erro\|Erro"
```

### Dashboard travado após digitar data

O `FilterBar.jsx` usa estado local e `isValidDate()` como guarda. Se regredir, verificar se `useState`/`useEffect` estão importados e se os handlers `handleInicio`/`handleFim` estão usando `localInicio`/`localFim` no `value` dos inputs.

### Venda aparecendo na unidade errada

A unidade da venda vem de `barbeiro.unidade` no frontend (`RegistroVenda.jsx → AbaVenda.onSubmit`). Verificar se o barbeiro está cadastrado com a unidade correta na tabela `profissionais`.

### Barbeiro aparece como Tamboré quando deveria ser Mutinga (ou vice-versa)

```sql
UPDATE profissionais SET unidade = 'mutinga' WHERE id = <id>;
```

### Reconstruir sem cache após dependências novas

```bash
docker compose build --no-cache backend
docker compose build --no-cache frontend
docker compose up -d
```

### Limpar todos os containers e volumes (DESTRUTIVO — apaga dados)

```bash
docker compose down -v
docker volume rm thieco_postgres_data
```

### Ver usuários cadastrados

```sql
SELECT id, username, role, unidade_acesso, ativo FROM usuarios;
```

### Redefinir senha de usuário

```sql
-- bcrypt hash gerado fora do banco ou via seed
UPDATE usuarios SET senha_hash = '$2a$12$...' WHERE username = 'mutinga';
```

Alternativa via Node:

```bash
docker exec -it thieco_api node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('NovaSenha123!', 12).then(h => console.log(h));
"
```

---

## 12. Decisões Técnicas Relevantes

### `ON DELETE SET NULL` em vendas.profissional_id

Ao excluir ou inativar um barbeiro, as vendas históricas são preservadas com `profissional_id = NULL`. Os relatórios agrupam essas vendas como "Barbeiro Removido". Isso garante integridade histórica sem bloquear a exclusão.

### Soft delete para profissionais (`ativo = false`)

Barbeiros são nunca deletados do banco. A flag `ativo = false` os remove de todos os seletores ativos e relatórios sem perder histórico. Isso resolve cenários de substituição de funcionários.

### Resolução de unidade no backend (admin vs. operador)

```js
const unidade = req.user.role === 'operador'
  ? req.user.unidade          // operador: fixado no JWT
  : (req.body.unidade ?? req.user.unidade);  // admin: body ou fallback JWT
```

Essa lógica está em `vendas.js` e `combos.js` (rota `ativar`). O erro anterior usava apenas `req.user.unidade` para todos os roles, o que causava as vendas do Tamboré ficarem zeradas pois o admin não enviava `unidade` no body.

### SWR com polling de 3 segundos

Usado em vez de WebSocket para simplificar a infraestrutura. O impacto de 3s de latência de atualização é aceitável para o contexto. `keepPreviousData: true` evita flash de loading a cada poll.

### Migrations idempotentes no startup

Toda a DDL está em `backend/models.js → runMigrations()` e usa `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`. O backend pode ser reiniciado a qualquer momento sem risco de re-executar migrations destrutivas.

### Unicidade de nome no catálogo por unidade

`CREATE UNIQUE INDEX uq_catalogo_nome_unidade ON catalogo (nome, COALESCE(unidade, ''))` — permite o mesmo nome de serviço em unidades diferentes (ex: "Corte" R$45 em Mutinga e "Corte" R$70 em Tamboré), mas itens sem unidade (`NULL`) ainda são únicos pelo nome.
