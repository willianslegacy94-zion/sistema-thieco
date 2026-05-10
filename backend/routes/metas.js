const { Router } = require('express');
const { body, query: qv, validationResult } = require('express-validator');
const { Meta } = require('../models');
const { query } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = Router();

const UNIDADES_VALIDAS = ['tambore', 'mutinga'];
const TIPOS_META       = ['faturamento', 'atendimentos', 'ticket_medio'];

// GET /metas — admin only
router.get('/', authenticate, requireAdmin,
  qv('profissional_id').optional().isInt(),
  qv('periodo').optional().isString(),
  qv('unidade').optional().isIn(UNIDADES_VALIDAS),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });
    try {
      const { rows } = await Meta.findAll(req.query);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

// POST /metas — admin only (upsert)
router.post('/', authenticate, requireAdmin,
  body('tipo').isIn(TIPOS_META),
  body('periodo').matches(/^\d{4}-\d{2}$/),
  body('meta_bronze').optional().isFloat({ min: 0 }),
  body('meta_prata').optional().isFloat({ min: 0 }),
  body('meta_ouro').optional().isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });
    try {
      const { rows } = await Meta.upsert(req.body);
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

// GET /metas/status — retorna status atual vs meta para o período
router.get('/status', authenticate,
  qv('periodo').notEmpty().matches(/^\d{4}-\d{2}$/),
  qv('unidade').optional().isIn(UNIDADES_VALIDAS),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

    const { periodo, unidade } = req.query;
    const isAdmin = req.user.role === 'admin';
    const myProfId = req.user.profissional_id;

    const inicio = periodo + '-01';
    const fim    = new Date(parseInt(periodo.slice(0,4)), parseInt(periodo.slice(5,7)), 0)
      .toISOString().slice(0, 10);

    const uf  = unidade ? `AND unidade = '${unidade}'`   : '';
    const ufv = unidade ? `AND v.unidade = '${unidade}'` : '';

    try {
      const { rows: metas } = await Meta.findAll({ periodo, ...(unidade ? { unidade } : {}) });

      const realizadoQ = await query(`
        SELECT p.id AS profissional_id, p.nome,
               ROUND(SUM(v.valor), 2)        AS faturamento,
               COUNT(v.id)::int              AS atendimentos,
               ROUND(AVG(v.valor), 2)        AS ticket_medio
        FROM vendas v
        INNER JOIN profissionais p ON p.id = v.profissional_id
        WHERE v.data BETWEEN $1 AND $2 ${ufv}
        GROUP BY p.id, p.nome
      `, [inicio, fim]);

      const status = realizadoQ.rows.map((r) => {
        const metaProf = metas.find((m) => m.profissional_id === r.profissional_id);
        const valorRealizado = {
          faturamento:  parseFloat(r.faturamento ?? 0),
          atendimentos: r.atendimentos,
          ticket_medio: parseFloat(r.ticket_medio ?? 0),
        };

        const calcNivel = (tipo, realizado, meta) => {
          if (!meta) return null;
          if (realizado >= (meta.meta_ouro   ?? Infinity)) return 'ouro';
          if (realizado >= (meta.meta_prata  ?? Infinity)) return 'prata';
          if (realizado >= (meta.meta_bronze ?? Infinity)) return 'bronze';
          return 'abaixo';
        };

        const nivel = metaProf
          ? calcNivel(metaProf.tipo, valorRealizado[metaProf.tipo], metaProf)
          : null;

        const isMine = r.profissional_id === myProfId;
        if (!isAdmin && !isMine) {
          return { profissional_id: r.profissional_id, nome: r.nome, nivel: null, realizado: null, meta: null };
        }

        return {
          profissional_id: r.profissional_id,
          nome: r.nome,
          realizado: valorRealizado,
          meta: metaProf ?? null,
          nivel,
          is_proprio: isMine,
        };
      });

      res.json({ periodo, status });
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  }
);

module.exports = router;
