const { Router } = require('express');
const { MetaUnidade } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { query } = require('../db');

const router = Router();

// GET /metas-unidade — listar configurações (admin)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { unidade, mes, ano } = req.query;
    const { rows } = await MetaUnidade.findAll({ unidade, mes, ano });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar metas.' });
  }
});

// POST /metas-unidade — criar/atualizar meta (admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      unidade, mes, ano, valor_global,
      piso_bronze, comissao_bronze,
      piso_prata,  comissao_prata,
      piso_ouro,   comissao_ouro,
    } = req.body;

    if (!unidade || !mes || !ano || !valor_global) {
      return res.status(400).json({ erro: 'unidade, mes, ano e valor_global são obrigatórios.' });
    }

    const { rows } = await MetaUnidade.upsert({
      unidade, mes: Number(mes), ano: Number(ano), valor_global,
      piso_bronze, comissao_bronze,
      piso_prata,  comissao_prata,
      piso_ouro,   comissao_ouro,
    });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao salvar meta.' });
  }
});

// GET /metas-unidade/progresso — faturamento atual vs metas (operador + admin)
router.get('/progresso', authenticate, async (req, res) => {
  try {
    const { role, unidade: unidadeJwt } = req.user;

    const unidade = role === 'operador' ? unidadeJwt : (req.query.unidade || unidadeJwt);
    const now     = new Date();
    const mes     = Number(req.query.mes) || (now.getMonth() + 1);
    const ano     = Number(req.query.ano) || now.getFullYear();

    const { rows: metaRows } = await MetaUnidade.findAll({ unidade, mes, ano });
    const meta = metaRows[0] ?? null;

    // Intervalo do mês
    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const fim    = new Date(ano, mes, 0).toISOString().slice(0, 10);

    const { rows: totRow } = await query(
      `SELECT COALESCE(SUM(valor), 0)::NUMERIC(10,2) AS realizado
       FROM vendas
       WHERE unidade = $1 AND data >= $2 AND data <= $3`,
      [unidade, inicio, fim]
    );
    const realizado = Number(totRow[0]?.realizado ?? 0);

    // Calcular nível e próximo patamar
    let nivel = null;
    let comissao_atual = 0;
    let proximo_nivel  = null;
    let falta_proximo  = null;

    if (meta) {
      const pisoBronze = Number(meta.piso_bronze ?? Infinity);
      const pisoPrata  = Number(meta.piso_prata  ?? Infinity);
      const pisoOuro   = Number(meta.piso_ouro   ?? Infinity);

      if (meta.piso_ouro  && realizado >= pisoOuro) {
        nivel          = 'ouro';
        comissao_atual = Number(meta.comissao_ouro ?? 0);
      } else if (meta.piso_prata && realizado >= pisoPrata) {
        nivel          = 'prata';
        comissao_atual = Number(meta.comissao_prata ?? 0);
        proximo_nivel  = 'ouro';
        falta_proximo  = meta.piso_ouro ? Math.max(0, pisoOuro - realizado) : null;
      } else if (meta.piso_bronze && realizado >= pisoBronze) {
        nivel          = 'bronze';
        comissao_atual = Number(meta.comissao_bronze ?? 0);
        proximo_nivel  = 'prata';
        falta_proximo  = meta.piso_prata ? Math.max(0, pisoPrata - realizado) : null;
      } else {
        nivel         = null;
        proximo_nivel = meta.piso_bronze ? 'bronze' : null;
        falta_proximo = meta.piso_bronze ? Math.max(0, pisoBronze - realizado) : null;
      }
    }

    res.json({ unidade, mes, ano, realizado, meta, nivel, comissao_atual, proximo_nivel, falta_proximo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao calcular progresso.' });
  }
});

module.exports = router;
