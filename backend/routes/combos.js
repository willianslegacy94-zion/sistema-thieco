const { Router } = require('express');
const { body, query: qv, validationResult } = require('express-validator');
const { Combo, Profissional } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { query } = require('../db');

const router = Router();

const UNIDADES_VALIDAS  = ['tambore', 'mutinga'];
const FORMAS_PAGAMENTO  = ['dinheiro', 'pix', 'credito', 'debito', 'cortesia'];

// Taxas PagBank (espelhadas de vendas.js para uso interno)
const TAXAS_PAGBANK = { debito: 0.0119, credito: 0.0349, pix: 0, dinheiro: 0, cortesia: 0 };
function calcularValorLiquido(valor, forma) {
  return parseFloat((valor * (1 - (TAXAS_PAGBANK[forma] ?? 0))).toFixed(2));
}

async function calcularComissao(profissional_id, valor) {
  const zero = { comissao: 0, comissao_servico: 0, comissao_produto: 0 };
  if (!profissional_id) return zero;
  const { rows } = await Profissional.findById(profissional_id);
  if (!rows.length) return zero;
  if (parseFloat(rows[0].percentual_comissao) === 0) return zero;
  // Combos são sempre serviços: 40% sobre o valor bruto
  const comissao_servico = parseFloat(((40 / 100) * parseFloat(valor)).toFixed(2));
  return { comissao: comissao_servico, comissao_servico, comissao_produto: 0 };
}

function addDias(dataISO, n) {
  const d = new Date(dataISO + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function hojeISO() { return new Date().toISOString().slice(0, 10); }

// ─── GET /combos/buscar — acessível a todos autenticados ─────────────────────
router.get('/buscar', authenticate,
  qv('nome').trim().notEmpty(),
  async (req, res) => {
    const nome = (req.query.nome ?? '').trim();
    if (!nome || nome.length < 2) return res.json(null);

    try {
      const { rows } = await query(`
        SELECT c.*, p.nome AS profissional_nome
        FROM combos c
        LEFT JOIN profissionais p ON p.id = c.profissional_id
        WHERE c.ativo = true AND LOWER(c.cliente_nome) LIKE LOWER($1)
        ORDER BY c.data_vencimento DESC LIMIT 1
      `, [`%${nome}%`]);

      res.json(rows[0] ?? null);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

// ─── POST /combos/uso — registrar uso de combo existente (operador/admin) ────
router.post('/uso', authenticate,
  (req, res, next) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'operador') return res.status(403).json({ erro: 'Acesso negado.' });
    next();
  },
  body('combo_id').isInt(),
  body('servico').trim().notEmpty(),
  body('valor').isFloat({ min: 0 }),
  body('forma_pagamento').optional().isIn(FORMAS_PAGAMENTO),
  body('bandeira_cartao').optional().trim(),
  body('alterar_plano').optional().isBoolean(),
  body('novo_servico').optional().trim(),
  body('novo_valor').optional().isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

    try {
      const { combo_id, servico, valor, forma_pagamento = 'dinheiro', bandeira_cartao,
              alterar_plano, novo_servico, novo_valor } = req.body;

      // Verifica combo
      const { rows: combos } = await query('SELECT * FROM combos WHERE id = $1 AND ativo = true', [combo_id]);
      if (!combos.length) return res.status(404).json({ erro: 'Combo não encontrado ou inativo.' });
      const combo = combos[0];

      const unidade = req.user.role === 'operador' ? req.user.unidade : combo.unidade;
      const profissional_id = req.user.profissional_id ?? combo.profissional_id ?? null;
      const { comissao, comissao_servico, comissao_produto } = await calcularComissao(profissional_id, parseFloat(valor));
      const val_liq   = calcularValorLiquido(parseFloat(valor), forma_pagamento);

      // Registra venda (atendimento do dia)
      const { rows: vendaRows } = await query(`
        INSERT INTO vendas (unidade, profissional_id, servico, valor, comissao, comissao_servico,
                            comissao_produto, forma_pagamento, data, nome_cliente, bandeira_cartao,
                            valor_liquido, tipo_cliente)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'agendado') RETURNING *
      `, [unidade, profissional_id, servico, valor, comissao, comissao_servico, comissao_produto,
          forma_pagamento, hojeISO(), combo.cliente_nome, bandeira_cartao ?? null, val_liq]);

      // Atualiza combo se solicitado
      if (alterar_plano && novo_servico) {
        const novaVenc = addDias(combo.data_vencimento, 30);
        await query(`UPDATE combos SET servicos = $1, valor = $2, data_vencimento = $3 WHERE id = $4`,
          [novo_servico.trim(), novo_valor ? parseFloat(novo_valor) : combo.valor, novaVenc, combo_id]);
      }

      res.status(201).json({ venda: vendaRows[0], combo_id });
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

// ─── POST /combos/ativar — vender e ativar novo combo (operador/admin) ───────
router.post('/ativar', authenticate,
  (req, res, next) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'operador') return res.status(403).json({ erro: 'Acesso negado.' });
    next();
  },
  body('cliente_nome').trim().notEmpty(),
  body('servicos').trim().notEmpty(),
  body('valor').isFloat({ min: 0 }),
  body('forma_pagamento').optional().isIn(FORMAS_PAGAMENTO),
  body('bandeira_cartao').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

    try {
      const { cliente_nome, servicos, valor, forma_pagamento = 'credito', bandeira_cartao } = req.body;
      const unidade = req.user.role === 'operador' ? req.user.unidade : (req.body.unidade ?? req.user.unidade);
      const profissional_id = req.user.profissional_id
        ?? (req.body.profissional_id ? parseInt(req.body.profissional_id) : null);

      const hoje          = hojeISO();
      const data_venc     = addDias(hoje, 30);
      const { comissao, comissao_servico, comissao_produto } = await calcularComissao(profissional_id, parseFloat(valor));
      const val_liq       = calcularValorLiquido(parseFloat(valor), forma_pagamento);

      // Cria combo
      const { rows: comboRows } = await query(`
        INSERT INTO combos (cliente_nome, profissional_id, unidade, data_aquisicao, data_vencimento, servicos, valor)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
      `, [cliente_nome.trim(), profissional_id, unidade, hoje, data_venc, servicos.trim(), valor]);

      // Cria venda (faturamento do dia)
      const { rows: vendaRows } = await query(`
        INSERT INTO vendas (unidade, profissional_id, servico, valor, comissao, comissao_servico,
                            comissao_produto, forma_pagamento, data, nome_cliente, bandeira_cartao,
                            valor_liquido, tipo_cliente)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'primeira_vez') RETURNING *
      `, [unidade, profissional_id, servicos.trim(), valor, comissao, comissao_servico, comissao_produto,
          forma_pagamento, hoje, cliente_nome.trim(), bandeira_cartao ?? null, val_liq]);

      res.status(201).json({ combo: comboRows[0], venda: vendaRows[0] });
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

// GET /combos
router.get('/', authenticate, requireAdmin,
  qv('unidade').optional().isIn(UNIDADES_VALIDAS),
  qv('apenas_vencidos').optional().isBoolean(),
  qv('profissional_id').optional().isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });
    try {
      const { rows } = await Combo.findAll(req.query);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

// POST /combos
router.post('/', authenticate, requireAdmin,
  body('cliente_nome').trim().notEmpty(),
  body('unidade').isIn(UNIDADES_VALIDAS),
  body('data_aquisicao').isDate(),
  body('data_vencimento').isDate(),
  body('servicos').trim().notEmpty(),
  body('valor').isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });
    try {
      const { rows } = await Combo.create(req.body);
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

// PATCH /combos/:id — desativar ou renovar
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const campos = {};
  if (req.body.ativo !== undefined) campos.ativo = req.body.ativo;
  if (req.body.data_vencimento)     campos.data_vencimento = req.body.data_vencimento;
  if (!Object.keys(campos).length)  return res.status(422).json({ erro: 'Nenhum campo para atualizar.' });
  try {
    const { rows } = await Combo.update(id, campos);
    if (!rows.length) return res.status(404).json({ erro: 'Combo não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
