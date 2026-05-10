const { Router } = require('express');
const { body, query: qv, validationResult } = require('express-validator');
const { Cliente } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = Router();

const UNIDADES_VALIDAS = ['tambore', 'mutinga'];
const TIPOS_CLIENTE    = ['regular', 'vip', 'combo'];

// GET /clientes — admin only
router.get('/', authenticate, requireAdmin,
  qv('unidade').optional().isIn(UNIDADES_VALIDAS),
  qv('tipo').optional().isIn(TIPOS_CLIENTE),
  qv('busca').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });
    try {
      const { rows } = await Cliente.findAll(req.query);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

// POST /clientes — admin only
router.post('/', authenticate, requireAdmin,
  body('nome').trim().notEmpty(),
  body('tipo').optional().isIn(TIPOS_CLIENTE),
  body('unidade').optional().isIn(UNIDADES_VALIDAS),
  body('primeira_visita').optional().isDate(),
  body('barbeiro_preferido_id').optional().isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });
    try {
      const { rows } = await Cliente.create(req.body);
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

// PATCH /clientes/:id — admin only
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  const allowed = ['nome', 'contato', 'tipo', 'barbeiro_preferido_id', 'unidade', 'ultima_visita', 'total_visitas', 'observacao', 'ativo'];
  const campos = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );
  if (!Object.keys(campos).length) return res.status(422).json({ erro: 'Nenhum campo para atualizar.' });
  try {
    const { rows } = await Cliente.update(req.params.id, campos);
    if (!rows.length) return res.status(404).json({ erro: 'Cliente não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
