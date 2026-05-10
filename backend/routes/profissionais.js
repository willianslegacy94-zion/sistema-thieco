const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const { Profissional } = require('../models');

const router = Router();

const UNIDADES_VALIDAS = ['tambore', 'mutinga'];

router.get('/', async (req, res) => {
  try {
    const { unidade, apenas_barbeiros } = req.query;
    const filtro = {};
    if (unidade && UNIDADES_VALIDAS.includes(unidade)) filtro.unidade = unidade;
    if (apenas_barbeiros === 'true') filtro.apenas_barbeiros = true;
    const { rows } = await Profissional.findAll(filtro);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/',
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('unidade').isIn(UNIDADES_VALIDAS).withMessage('Unidade inválida'),
  body('percentual_comissao').optional().isFloat({ min: 0, max: 100 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

    try {
      const { rows } = await Profissional.create(req.body);
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

module.exports = router;
