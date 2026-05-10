const { Router } = require('express');
const { body, query: qv, validationResult } = require('express-validator');
const { Venda, Profissional } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = Router();

const FORMAS_PAGAMENTO = ['dinheiro', 'pix', 'credito', 'debito', 'cortesia'];
const UNIDADES_VALIDAS = ['tambore', 'mutinga'];
const TIPOS_CLIENTE    = ['agendado', 'esporadico', 'primeira_vez'];

async function calcularComissao(profissional_id, valor) {
  if (!profissional_id) return 0;
  const { rows } = await Profissional.findById(profissional_id);
  if (!rows.length) return 0;
  return parseFloat(((rows[0].percentual_comissao / 100) * valor).toFixed(2));
}

// GET /vendas — admin vê tudo; barbeiro vê apenas as próprias
router.get('/',
  authenticate,
  qv('unidade').optional().isIn(UNIDADES_VALIDAS),
  qv('inicio').optional().isDate(),
  qv('fim').optional().isDate(),
  qv('profissional_id').optional().isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

    // Barbeiro só pode ver as próprias vendas — sobrescreve qualquer filtro enviado
    if (req.user.role !== 'admin') {
      req.query.profissional_id = req.user.profissional_id;
    }

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
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

    try {
      const unidade = req.user.role === 'operador'
        ? req.user.unidade
        : req.body.unidade;

      if (!unidade) return res.status(422).json({ erro: 'Unidade não definida.' });

      const {
        profissional_id, servico, valor, forma_pagamento, data, observacao,
        desconto, tipo_cliente, upsell, venda_origem_id, qtd_clientes,
      } = req.body;

      const comissao = req.body.comissao !== undefined
        ? parseFloat(req.body.comissao)
        : await calcularComissao(profissional_id, parseFloat(valor));

      const { rows } = await Venda.create({
        unidade, profissional_id: profissional_id ?? null,
        servico, valor, comissao, forma_pagamento, data, observacao,
        desconto: desconto ?? 0,
        tipo_cliente: tipo_cliente ?? 'agendado',
        upsell: upsell ?? false,
        venda_origem_id: venda_origem_id ?? null,
        qtd_clientes: qtd_clientes ?? 1,
      });
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

module.exports = router;
