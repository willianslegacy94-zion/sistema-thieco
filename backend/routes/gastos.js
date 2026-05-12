const { Router } = require('express');
const { body, param, query: qv, validationResult } = require('express-validator');
const { Gasto } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { query } = require('../db');

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

// PUT /gastos/:id — admin only
router.put('/:id',
  authenticate,
  requireAdmin,
  param('id').isInt(),
  body('unidade').optional().isIn(UNIDADES_VALIDAS),
  body('categoria').optional().isString(),
  body('descricao').optional().trim().notEmpty(),
  body('valor').optional().isFloat({ min: 0 }),
  body('data').optional().isDate(),
  body('valor_previsto').optional({ nullable: true }).isFloat({ min: 0 }),
  body('observacao').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

    try {
      const EDITAVEIS = ['unidade', 'categoria', 'descricao', 'valor', 'data', 'valor_previsto', 'observacao'];
      const sets = [];
      const params = [];
      for (const campo of EDITAVEIS) {
        if (req.body[campo] !== undefined) {
          sets.push(`${campo} = $${params.push(req.body[campo])}`);
        }
      }
      if (sets.length === 0) return res.status(422).json({ erro: 'Nenhum campo para atualizar.' });
      params.push(req.params.id);
      const { rows } = await query(
        `UPDATE gastos SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );
      if (!rows.length) return res.status(404).json({ erro: 'Despesa não encontrada.' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

// DELETE /gastos/:id — admin only
router.delete('/:id',
  authenticate,
  requireAdmin,
  param('id').isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

    try {
      const { rowCount } = await query('DELETE FROM gastos WHERE id = $1', [req.params.id]);
      if (!rowCount) return res.status(404).json({ erro: 'Despesa não encontrada.' });
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

module.exports = router;
