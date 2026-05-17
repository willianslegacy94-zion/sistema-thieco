const { Router } = require('express');
const { body, param, query: qv, validationResult } = require('express-validator');
const { Venda, Profissional } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { query } = require('../db');

const router = Router();

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const FORMAS_PAGAMENTO  = ['dinheiro', 'pix', 'credito', 'debito', 'cortesia'];
const UNIDADES_VALIDAS  = ['tambore', 'mutinga'];
const TIPOS_CLIENTE     = ['agendado', 'esporadico', 'primeira_vez'];
const ORIGENS_CLIENTE   = ['whatsapp', 'indicacao', 'organico'];

// Taxas PagBank para cálculo do valor líquido
const TAXAS_PAGBANK = {
  debito:   0.0119,
  credito:  0.0349,
  pix:      0,
  dinheiro: 0,
  cortesia: 0,
};

function calcularValorLiquido(valor, forma_pagamento) {
  const taxa = TAXAS_PAGBANK[forma_pagamento] ?? 0;
  return parseFloat((valor * (1 - taxa)).toFixed(2));
}

async function calcularComissao(profissional_id, valor, tipo_item = 'servico') {
  if (!profissional_id) return 0;
  const { rows } = await Profissional.findById(profissional_id);
  if (!rows.length) return 0;
  if (parseFloat(rows[0].percentual_comissao) === 0) return 0;
  const pct = tipo_item === 'produto' ? 10 : 40;
  return parseFloat(((pct / 100) * valor).toFixed(2));
}

// GET /vendas — admin vê tudo; barbeiro vê apenas as próprias
router.get('/',
  authenticate,
  qv('unidade').optional().isIn(UNIDADES_VALIDAS),
  qv('inicio').optional({ values: 'falsy' }).isDate(),
  qv('fim').optional({ values: 'falsy' }).isDate(),
  qv('profissional_id').optional().isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

    // Barbeiro só pode ver as próprias vendas — sobrescreve qualquer filtro enviado
    if (req.user.role !== 'admin') {
      req.query.profissional_id = req.user.profissional_id;
    }

    // Fallback: se nenhuma data for enviada, exibe apenas o dia atual
    if (!req.query.inicio) req.query.inicio = hojeISO();
    if (!req.query.fim)    req.query.fim    = hojeISO();

    try {
      const { rows } = await Venda.findAll(req.query);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

// POST /vendas — admin (qualquer unidade) ou operador (força sua unidade)
router.post('/',
  authenticate,
  (req, res, next) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'operador')
      return res.status(403).json({ erro: 'Acesso negado.' });
    next();
  },
  body('unidade').optional().isIn(UNIDADES_VALIDAS),
  body('servico').trim().notEmpty(),
  body('valor').isFloat({ min: 0 }),
  body('data').isDate(),
  body('forma_pagamento').optional().isIn(FORMAS_PAGAMENTO),
  body('profissional_id').optional().isInt(),
  body('desconto').optional().isFloat({ min: 0 }),
  body('tipo_cliente').optional().isIn(TIPOS_CLIENTE),
  body('upsell').optional().isBoolean(),
  body('venda_origem_id').optional().isInt(),
  body('qtd_clientes').optional().isInt({ min: 1 }),
  body('nome_cliente').optional().trim(),
  body('origem_cliente').optional().isIn(ORIGENS_CLIENTE),
  body('bandeira_cartao').optional().trim(),
  body('tipo_item').optional().isIn(['servico', 'produto']),
  body('telefone_cliente').optional().trim(),
  body('data_nascimento_cliente').optional({ values: 'falsy' }).isDate(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

    try {
      const unidade = req.user.role === 'operador'
        ? req.user.unidade
        : (req.body.unidade ?? req.user.unidade);

      if (!unidade) return res.status(422).json({ erro: 'Unidade não definida.' });

      const {
        profissional_id, servico, valor, forma_pagamento, data, observacao,
        desconto, tipo_cliente, upsell, venda_origem_id, qtd_clientes,
        nome_cliente, origem_cliente, bandeira_cartao, tipo_item,
        telefone_cliente, data_nascimento_cliente,
      } = req.body;

      const tipoItem = tipo_item ?? 'servico';

      const comissao = req.body.comissao !== undefined
        ? parseFloat(req.body.comissao)
        : await calcularComissao(profissional_id, parseFloat(valor), tipoItem);

      const valor_liquido = calcularValorLiquido(parseFloat(valor), forma_pagamento ?? 'dinheiro');

      const { rows } = await Venda.create({
        unidade, profissional_id: profissional_id ?? null,
        servico, valor, comissao, forma_pagamento, data, observacao,
        desconto: desconto ?? 0,
        tipo_cliente: tipo_cliente ?? 'agendado',
        upsell: upsell ?? false,
        venda_origem_id: venda_origem_id ?? null,
        qtd_clientes: qtd_clientes ?? 1,
        nome_cliente: nome_cliente ?? null,
        origem_cliente: origem_cliente ?? null,
        bandeira_cartao: bandeira_cartao ?? null,
        valor_liquido,
        tipo_item: tipoItem,
      });

      // Persistência dupla: upsert do cliente vinculado à venda
      if (nome_cliente) {
        const { rows: clientes } = await query(
          `SELECT id FROM clientes WHERE LOWER(nome) = LOWER($1) AND ativo = true LIMIT 1`,
          [nome_cliente]
        );

        if (clientes.length > 0) {
          // Cliente já existe — atualiza apenas os campos fornecidos
          const sets   = [];
          const params = [clientes[0].id];
          if (telefone_cliente)        sets.push(`contato = $${params.push(telefone_cliente)}`);
          if (data_nascimento_cliente) sets.push(`data_nascimento = $${params.push(data_nascimento_cliente)}`);
          if (profissional_id)         sets.push(`barbeiro_responsavel_id = $${params.push(profissional_id)}`);
          if (sets.length > 0) {
            await query(`UPDATE clientes SET ${sets.join(', ')} WHERE id = $1`, params);
          }
        } else {
          // Cliente novo — cadastra automaticamente a partir dos dados da venda
          await query(
            `INSERT INTO clientes
               (nome, contato, unidade, primeira_visita, ultima_visita,
                data_nascimento, barbeiro_responsavel_id)
             VALUES ($1, $2, $3, $4, $4, $5, $6)`,
            [
              nome_cliente,
              telefone_cliente        ?? null,
              unidade,
              data,                             // primeira_visita = ultima_visita = data da venda
              data_nascimento_cliente ?? null,
              profissional_id         ?? null,
            ]
          );
        }
      }

      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

// PUT /vendas/:id — admin ou operador (sua unidade)
router.put('/:id',
  authenticate,
  (req, res, next) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'operador')
      return res.status(403).json({ erro: 'Acesso negado.' });
    next();
  },
  param('id').isInt(),
  body('servico').optional().trim().notEmpty(),
  body('valor').optional().isFloat({ min: 0 }),
  body('forma_pagamento').optional().isIn(FORMAS_PAGAMENTO),
  body('desconto').optional().isFloat({ min: 0 }),
  body('observacao').optional().isString(),
  body('data').optional().isDate(),
  body('profissional_id').optional({ nullable: true }).isInt(),
  body('tipo_cliente').optional().isIn(TIPOS_CLIENTE),
  body('qtd_clientes').optional().isInt({ min: 1 }),
  body('nome_cliente').optional().trim(),
  body('origem_cliente').optional().isIn(ORIGENS_CLIENTE),
  body('bandeira_cartao').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

    try {
      const { rows: existing } = await query('SELECT * FROM vendas WHERE id = $1', [req.params.id]);
      if (!existing.length) return res.status(404).json({ erro: 'Venda não encontrada.' });

      const venda = existing[0];
      if (req.user.role === 'operador' && venda.unidade !== req.user.unidade)
        return res.status(403).json({ erro: 'Sem permissão para editar esta venda.' });

      const EDITAVEIS = ['servico', 'valor', 'forma_pagamento', 'desconto', 'observacao', 'data',
                         'profissional_id', 'tipo_cliente', 'qtd_clientes',
                         'nome_cliente', 'origem_cliente', 'bandeira_cartao', 'tipo_item'];
      const sets = [];
      const params = [];

      for (const campo of EDITAVEIS) {
        if (req.body[campo] !== undefined) {
          sets.push(`${campo} = $${params.push(req.body[campo])}`);
        }
      }

      if (req.body.valor !== undefined || req.body.profissional_id !== undefined || req.body.tipo_item !== undefined) {
        const novoValor    = req.body.valor           !== undefined ? parseFloat(req.body.valor) : parseFloat(venda.valor);
        const novoProfId   = req.body.profissional_id !== undefined ? req.body.profissional_id   : venda.profissional_id;
        const novoTipo     = req.body.tipo_item       !== undefined ? req.body.tipo_item          : (venda.tipo_item ?? 'servico');
        const novaComissao = await calcularComissao(novoProfId, novoValor, novoTipo);
        sets.push(`comissao = $${params.push(novaComissao)}`);
      }

      if (req.body.valor !== undefined || req.body.forma_pagamento !== undefined) {
        const novoValor = req.body.valor !== undefined ? parseFloat(req.body.valor) : parseFloat(venda.valor);
        const novaForma = req.body.forma_pagamento ?? venda.forma_pagamento;
        sets.push(`valor_liquido = $${params.push(calcularValorLiquido(novoValor, novaForma))}`);
      }

      if (sets.length === 0) return res.status(422).json({ erro: 'Nenhum campo para atualizar.' });

      params.push(req.params.id);
      const { rows } = await query(
        `UPDATE vendas SET ${sets.join(', ')} WHERE id = $${params.length}
         RETURNING *, (SELECT nome FROM profissionais WHERE id = profissional_id) AS profissional_nome`,
        params
      );
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

// DELETE /vendas/:id — admin only
router.delete('/:id',
  authenticate,
  requireAdmin,
  param('id').isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

    try {
      const { rowCount } = await query('DELETE FROM vendas WHERE id = $1', [req.params.id]);
      if (!rowCount) return res.status(404).json({ erro: 'Venda não encontrada.' });
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

module.exports = router;
