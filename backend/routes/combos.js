const { Router } = require('express');
const { body, query: qv, validationResult } = require('express-validator');
const { Combo } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = Router();

const UNIDADES_VALIDAS = ['tambore', 'mutinga'];

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
