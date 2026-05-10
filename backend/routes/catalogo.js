const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { Catalogo } = require('../models');

const router = Router();

// GET /catalogo — público (usado no RegistroVenda para sugestões)
router.get('/', async (req, res) => {
  try {
    const { categoria, controla_estoque, ativo = 'true' } = req.query;
    const { rows } = await Catalogo.findAll({
      categoria,
      controla_estoque,
      ativo: ativo === 'false' ? false : true,
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /catalogo — admin
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await Catalogo.create(req.body);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ erro: 'Já existe um item com esse nome.' });
    res.status(500).json({ erro: err.message });
  }
});

// PUT /catalogo/:id — admin
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await Catalogo.update(parseInt(req.params.id), req.body);
    if (!rows.length) return res.status(404).json({ erro: 'Item não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ erro: 'Já existe um item com esse nome.' });
    res.status(500).json({ erro: err.message });
  }
});

// PATCH /catalogo/:id/quantidade — admin (ajuste de estoque)
router.patch('/:id/quantidade', authenticate, requireAdmin, async (req, res) => {
  try {
    const delta = parseInt(req.body.delta);
    if (isNaN(delta)) return res.status(400).json({ erro: 'delta deve ser um número inteiro.' });
    const { rows } = await Catalogo.ajustarQuantidade(parseInt(req.params.id), delta);
    if (!rows.length) return res.status(404).json({ erro: 'Item não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
