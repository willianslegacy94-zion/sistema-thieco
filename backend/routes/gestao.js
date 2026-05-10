/**
 * Módulo de Gestão de Time — Acesso Admin
 *
 * Autenticação via header: x-admin-pin: <PIN>
 * PIN padrão: definido em ADMIN_PIN no .env (fallback: 2121)
 *
 * GET    /gestao/feedbacks?profissional_id=X
 * POST   /gestao/feedbacks
 * DELETE /gestao/feedbacks/:id
 *
 * GET    /gestao/pdca?profissional_id=X&status=X
 * POST   /gestao/pdca
 * PUT    /gestao/pdca/:id
 * DELETE /gestao/pdca/:id
 *
 * GET    /gestao/sugestoes?unidade=X&status=X&prioridade=X
 * POST   /gestao/sugestoes
 * PUT    /gestao/sugestoes/:id
 *
 * GET    /gestao/timeline/:profissional_id
 */

const { Router } = require('express');
const { body, param, query: qv, validationResult } = require('express-validator');
const { query } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = Router();

// Gestão de Time: exige JWT válido + role admin
router.use(authenticate, requireAdmin);

// ─── Helper ──────────────────────────────────────────────────────────────────

function validar(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ erros: errors.array() });
    return false;
  }
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// FEEDBACKS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/feedbacks',
  qv('profissional_id').optional().isInt(),
  qv('tipo').optional().isIn(['elogio', 'melhoria']),
  async (req, res) => {
    if (!validar(req, res)) return;
    const { profissional_id, tipo } = req.query;
    const conds = [];
    const params = [];
    if (profissional_id) conds.push(`f.profissional_id = $${params.push(profissional_id)}`);
    if (tipo)           conds.push(`f.tipo = $${params.push(tipo)}`);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    try {
      const { rows } = await query(
        `SELECT f.*, p.nome AS profissional_nome
         FROM feedbacks f
         JOIN profissionais p ON p.id = f.profissional_id
         ${where}
         ORDER BY f.data DESC, f.created_at DESC`,
        params
      );
      res.json(rows);
    } catch (err) { res.status(500).json({ erro: err.message }); }
  }
);

router.post('/feedbacks',
  body('profissional_id').isInt({ min: 1 }),
  body('tipo').isIn(['elogio', 'melhoria']),
  body('categoria').trim().notEmpty(),
  body('titulo').trim().isLength({ min: 3, max: 150 }),
  body('descricao').trim().isLength({ min: 5 }),
  body('data').optional().isDate(),
  async (req, res) => {
    if (!validar(req, res)) return;
    const { profissional_id, tipo, categoria, titulo, descricao, data } = req.body;
    try {
      const { rows } = await query(
        `INSERT INTO feedbacks (profissional_id, tipo, categoria, titulo, descricao, data)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [profissional_id, tipo, categoria, titulo, descricao, data ?? new Date().toISOString().slice(0, 10)]
      );
      res.status(201).json(rows[0]);
    } catch (err) { res.status(500).json({ erro: err.message }); }
  }
);

router.delete('/feedbacks/:id',
  param('id').isInt(),
  async (req, res) => {
    if (!validar(req, res)) return;
    try {
      const { rowCount } = await query(`DELETE FROM feedbacks WHERE id = $1`, [req.params.id]);
      if (!rowCount) return res.status(404).json({ erro: 'Feedback não encontrado.' });
      res.json({ mensagem: 'Feedback removido.' });
    } catch (err) { res.status(500).json({ erro: err.message }); }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// PLANOS DE AÇÃO (PDCA)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/pdca',
  qv('profissional_id').optional().isInt(),
  qv('status').optional().isIn(['pendente', 'em_andamento', 'concluido', 'cancelado']),
  async (req, res) => {
    if (!validar(req, res)) return;
    const { profissional_id, status } = req.query;
    const conds = [];
    const params = [];
    if (profissional_id) conds.push(`p.profissional_id = $${params.push(profissional_id)}`);
    if (status)          conds.push(`p.status = $${params.push(status)}`);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    try {
      const { rows } = await query(
        `SELECT p.*, pr.nome AS profissional_nome
         FROM planos_acao p
         JOIN profissionais pr ON pr.id = p.profissional_id
         ${where}
         ORDER BY
           CASE p.status WHEN 'em_andamento' THEN 1 WHEN 'pendente' THEN 2 WHEN 'concluido' THEN 3 ELSE 4 END,
           p.created_at DESC`,
        params
      );
      res.json(rows);
    } catch (err) { res.status(500).json({ erro: err.message }); }
  }
);

router.post('/pdca',
  body('profissional_id').isInt({ min: 1 }),
  body('titulo').trim().isLength({ min: 3, max: 200 }),
  body('planejar').trim().isLength({ min: 5 }),
  body('executar').optional().isString(),
  body('checar').optional().isString(),
  body('agir').optional().isString(),
  body('data_meta').optional().isDate(),
  async (req, res) => {
    if (!validar(req, res)) return;
    const { profissional_id, titulo, planejar, executar, checar, agir, data_meta } = req.body;
    try {
      const { rows } = await query(
        `INSERT INTO planos_acao (profissional_id, titulo, planejar, executar, checar, agir, data_meta)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [profissional_id, titulo, planejar, executar ?? '', checar ?? '', agir ?? '', data_meta ?? null]
      );
      res.status(201).json(rows[0]);
    } catch (err) { res.status(500).json({ erro: err.message }); }
  }
);

router.put('/pdca/:id',
  param('id').isInt(),
  body('titulo').optional().trim().isLength({ min: 3, max: 200 }),
  body('planejar').optional().isString(),
  body('executar').optional().isString(),
  body('checar').optional().isString(),
  body('agir').optional().isString(),
  body('status').optional().isIn(['pendente', 'em_andamento', 'concluido', 'cancelado']),
  body('data_meta').optional().isDate(),
  async (req, res) => {
    if (!validar(req, res)) return;
    const { titulo, planejar, executar, checar, agir, status, data_meta } = req.body;
    const setCols = [];
    const params = [];

    if (titulo    !== undefined) setCols.push(`titulo = $${params.push(titulo)}`);
    if (planejar  !== undefined) setCols.push(`planejar = $${params.push(planejar)}`);
    if (executar  !== undefined) setCols.push(`executar = $${params.push(executar)}`);
    if (checar    !== undefined) setCols.push(`checar = $${params.push(checar)}`);
    if (agir      !== undefined) setCols.push(`agir = $${params.push(agir)}`);
    if (status    !== undefined) {
      setCols.push(`status = $${params.push(status)}`);
      if (status === 'concluido') setCols.push(`data_conclusao = CURRENT_DATE`);
    }
    if (data_meta !== undefined) setCols.push(`data_meta = $${params.push(data_meta)}`);

    setCols.push(`updated_at = NOW()`);
    params.push(req.params.id);

    try {
      const { rows, rowCount } = await query(
        `UPDATE planos_acao SET ${setCols.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );
      if (!rowCount) return res.status(404).json({ erro: 'Plano não encontrado.' });
      res.json(rows[0]);
    } catch (err) { res.status(500).json({ erro: err.message }); }
  }
);

router.delete('/pdca/:id',
  param('id').isInt(),
  async (req, res) => {
    if (!validar(req, res)) return;
    try {
      const { rowCount } = await query(`DELETE FROM planos_acao WHERE id = $1`, [req.params.id]);
      if (!rowCount) return res.status(404).json({ erro: 'Plano não encontrado.' });
      res.json({ mensagem: 'Plano removido.' });
    } catch (err) { res.status(500).json({ erro: err.message }); }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// SUGESTÕES DE MELHORIA
// ══════════════════════════════════════════════════════════════════════════════

router.get('/sugestoes',
  qv('unidade').optional().isString(),
  qv('status').optional().isIn(['aberta', 'em_analise', 'aprovada', 'implementada', 'rejeitada']),
  qv('prioridade').optional().isIn(['baixa', 'media', 'alta']),
  async (req, res) => {
    if (!validar(req, res)) return;
    const { unidade, status, prioridade } = req.query;
    const conds = [];
    const params = [];
    if (unidade)    conds.push(`unidade = $${params.push(unidade)}`);
    if (status)     conds.push(`status = $${params.push(status)}`);
    if (prioridade) conds.push(`prioridade = $${params.push(prioridade)}`);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    try {
      const { rows } = await query(
        `SELECT * FROM sugestoes ${where}
         ORDER BY
           CASE prioridade WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
           created_at DESC`,
        params
      );
      res.json(rows);
    } catch (err) { res.status(500).json({ erro: err.message }); }
  }
);

router.post('/sugestoes',
  body('unidade').trim().notEmpty(),
  body('categoria').trim().notEmpty(),
  body('titulo').trim().isLength({ min: 3, max: 200 }),
  body('descricao').trim().isLength({ min: 5 }),
  body('prioridade').optional().isIn(['baixa', 'media', 'alta']),
  async (req, res) => {
    if (!validar(req, res)) return;
    const { unidade, categoria, titulo, descricao, prioridade } = req.body;
    try {
      const { rows } = await query(
        `INSERT INTO sugestoes (unidade, categoria, titulo, descricao, prioridade)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [unidade, categoria, titulo, descricao, prioridade ?? 'media']
      );
      res.status(201).json(rows[0]);
    } catch (err) { res.status(500).json({ erro: err.message }); }
  }
);

router.put('/sugestoes/:id',
  param('id').isInt(),
  body('status').optional().isIn(['aberta', 'em_analise', 'aprovada', 'implementada', 'rejeitada']),
  body('prioridade').optional().isIn(['baixa', 'media', 'alta']),
  body('titulo').optional().isString(),
  body('descricao').optional().isString(),
  async (req, res) => {
    if (!validar(req, res)) return;
    const { status, prioridade, titulo, descricao } = req.body;
    const setCols = [];
    const params = [];
    if (status)     setCols.push(`status = $${params.push(status)}`);
    if (prioridade) setCols.push(`prioridade = $${params.push(prioridade)}`);
    if (titulo)     setCols.push(`titulo = $${params.push(titulo)}`);
    if (descricao)  setCols.push(`descricao = $${params.push(descricao)}`);
    setCols.push(`updated_at = NOW()`);
    params.push(req.params.id);
    try {
      const { rows, rowCount } = await query(
        `UPDATE sugestoes SET ${setCols.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );
      if (!rowCount) return res.status(404).json({ erro: 'Sugestão não encontrada.' });
      res.json(rows[0]);
    } catch (err) { res.status(500).json({ erro: err.message }); }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// TIMELINE DE EVOLUÇÃO
// ══════════════════════════════════════════════════════════════════════════════

router.get('/timeline/:profissional_id',
  param('profissional_id').isInt(),
  async (req, res) => {
    if (!validar(req, res)) return;
    const { profissional_id } = req.params;
    try {
      // Verifica que o profissional existe
      const { rows: prof } = await query(
        `SELECT id, nome FROM profissionais WHERE id = $1`, [profissional_id]
      );
      if (!prof.length) return res.status(404).json({ erro: 'Profissional não encontrado.' });

      // UNION: feedbacks + eventos de PDCA + marcos de venda (primeiro e melhor mês)
      const { rows } = await query(`
        SELECT
          'feedback'        AS tipo,
          f.id::TEXT        AS ref_id,
          f.data            AS data,
          f.tipo            AS subtipo,
          f.titulo          AS titulo,
          f.descricao       AS descricao,
          f.categoria       AS categoria,
          NULL              AS extra
        FROM feedbacks f
        WHERE f.profissional_id = $1

        UNION ALL

        SELECT
          'pdca'            AS tipo,
          p.id::TEXT        AS ref_id,
          p.data_inicio     AS data,
          p.status          AS subtipo,
          p.titulo          AS titulo,
          p.planejar        AS descricao,
          NULL              AS categoria,
          p.data_meta::TEXT AS extra
        FROM planos_acao p
        WHERE p.profissional_id = $1

        UNION ALL

        SELECT
          'pdca_conclusao'  AS tipo,
          p.id::TEXT        AS ref_id,
          p.data_conclusao  AS data,
          'concluido'       AS subtipo,
          p.titulo          AS titulo,
          p.agir            AS descricao,
          NULL              AS categoria,
          NULL              AS extra
        FROM planos_acao p
        WHERE p.profissional_id = $1
          AND p.status = 'concluido'
          AND p.data_conclusao IS NOT NULL

        ORDER BY data DESC NULLS LAST
      `, [profissional_id]);

      // Resumo estatístico
      const { rows: stats } = await query(`
        SELECT
          COUNT(DISTINCT CASE WHEN f.tipo = 'elogio'   THEN f.id END) AS total_elogios,
          COUNT(DISTINCT CASE WHEN f.tipo = 'melhoria' THEN f.id END) AS total_melhorias,
          COUNT(DISTINCT p.id)                                         AS total_pdca,
          COUNT(DISTINCT CASE WHEN p.status = 'concluido' THEN p.id END) AS pdca_concluidos
        FROM profissionais pr
        LEFT JOIN feedbacks f    ON f.profissional_id = pr.id
        LEFT JOIN planos_acao p  ON p.profissional_id = pr.id
        WHERE pr.id = $1
      `, [profissional_id]);

      res.json({
        profissional: prof[0],
        stats: stats[0],
        timeline: rows,
      });
    } catch (err) { res.status(500).json({ erro: err.message }); }
  }
);

module.exports = router;
