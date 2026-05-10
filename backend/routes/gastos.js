const { Router } = require('express');
const { body, query: qv, validationResult } = require('express-validator');
const { Gasto } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = Router();

const CATEGORIAS = ['aluguel', 'produtos', 'salario', 'marketing', 'manutencao', 'equipamentos', 'outros'];
const UNIDADES_VALIDAS = ['tambore', 'mutinga'];

// GET /gastos — admin only
router.get('/',
  authenticate,
  requireAdmin,
  qv('unidade').optional().isIn(UNIDADES_VALIDAS),
  qv('inicio').optional().isDate(),
  qv('fim').optional().isDate(),
  qv('categoria').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

    try {
      const { rows } = await Gasto.findAll(req.query);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

// POST /gastos — admin only
router.post('/',
  authenticate,
  requireAdmin,
  body('unidade').isIn(UNIDADES_VALIDAS),
  body('categoria').trim().notEmpty(),
  body('descricao').trim().notEmpty(),
  body('valor').isFloat({ min: 0 }),
  body('data').isDate(),
  body('valor_previsto').optional().isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

    try {
      const { rows } = await Gasto.create(req.body);
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

module.exports = router;
