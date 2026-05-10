/**
 * POST /import
 *
 * Aceita JSON exportado do Excel com o formato:
 * {
 *   "vendas": [
 *     {
 *       "data": "2024-03-15",          // obrigatório — YYYY-MM-DD ou DD/MM/YYYY
 *       "unidade": "tambore",           // obrigatório — tambore | mutinga
 *       "profissional": "Igor",         // nome livre; resolve pelo cadastro
 *       "servico": "Corte + Barba",     // obrigatório
 *       "valor": 65.00,                 // obrigatório
 *       "comissao": 26.00,              // opcional — calcula pelo % se ausente
 *       "forma_pagamento": "pix"        // opcional
 *     }
 *   ],
 *   "gastos": [
 *     {
 *       "data": "2024-03-01",
 *       "unidade": "tambore",
 *       "categoria": "aluguel",
 *       "descricao": "Aluguel março",
 *       "valor": 3500.00
 *     }
 *   ]
 * }
 */

const { Router } = require('express');
const { Venda, Gasto, Profissional } = require('../models');

const router = Router();

const UNIDADES_VALIDAS = new Set(['tambore', 'mutinga']);

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // DD/MM/YYYY → YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m}-${d}`;
  }
  // already ISO or close
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function normalizeUnidade(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (s.includes('tambore') || s.includes('tamboro')) return 'tambore';
  if (s.includes('mutinga')) return 'mutinga';
  return null;
}

// Cache de profissionais (inclui inativos para cobrir histórico)
async function buildProfissionalCache() {
  const { query } = require('../db');
  const { rows } = await query('SELECT * FROM profissionais ORDER BY ativo DESC, id ASC');
  const cache = {};

  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  const STOPWORDS = new Set(['dos', 'das', 'des', 'de', 'da', 'do', 'e']);

  for (const p of rows) {
    const nomeNorm = norm(p.nome);
    // índice pelo nome completo normalizado
    if (!cache[nomeNorm]) cache[nomeNorm] = p;
    // índice por cada token do nome (ativos têm prioridade — inseridos primeiro)
    nomeNorm.split(/\s+/).forEach(token => {
      if (token.length > 2 && !STOPWORDS.has(token) && !cache[token]) {
        cache[token] = p;
      }
    });
  }
  return cache;
}

function validarVenda(v, idx) {
  const erros = [];
  if (!normalizeDate(v.data))         erros.push(`vendas[${idx}]: data inválida ("${v.data}")`);
  if (!normalizeUnidade(v.unidade))   erros.push(`vendas[${idx}]: unidade inválida ("${v.unidade}")`);
  if (!v.servico)                     erros.push(`vendas[${idx}]: campo "servico" obrigatório`);
  if (isNaN(parseFloat(v.valor)))     erros.push(`vendas[${idx}]: valor inválido ("${v.valor}")`);
  return erros;
}

function validarGasto(g, idx) {
  const erros = [];
  if (!normalizeDate(g.data))         erros.push(`gastos[${idx}]: data inválida ("${g.data}")`);
  if (!normalizeUnidade(g.unidade))   erros.push(`gastos[${idx}]: unidade inválida ("${g.unidade}")`);
  if (!g.categoria)                   erros.push(`gastos[${idx}]: campo "categoria" obrigatório`);
  if (!g.descricao)                   erros.push(`gastos[${idx}]: campo "descricao" obrigatório`);
  if (isNaN(parseFloat(g.valor)))     erros.push(`gastos[${idx}]: valor inválido ("${g.valor}")`);
  return erros;
}

// ─── Route ───────────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { vendas = [], gastos = [] } = req.body;

  if (!Array.isArray(vendas) || !Array.isArray(gastos)) {
    return res.status(400).json({
      erro: 'O body deve conter as chaves "vendas" e "gastos" como arrays.',
    });
  }

  // ── Validação prévia (sem tocar no banco)
  const erros = [];
  vendas.forEach((v, i) => erros.push(...validarVenda(v, i)));
  gastos.forEach((g, i) => erros.push(...validarGasto(g, i)));

  if (erros.length > 0) {
    return res.status(422).json({ erro: 'Dados inválidos. Corrija antes de importar.', detalhes: erros });
  }

  try {
    const profCache = await buildProfissionalCache();

    // ── Preparar vendas
    function normKey(s) {
      return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    const vendasPreparadas = vendas.map((v) => {
      const profissional = v.profissional
        ? profCache[normKey(v.profissional)]
        : null;

      const valor = parseFloat(v.valor);
      const comissao = v.comissao !== undefined
        ? parseFloat(v.comissao)
        : profissional
          ? parseFloat(((profissional.percentual_comissao / 100) * valor).toFixed(2))
          : 0;

      return {
        data: normalizeDate(v.data),
        unidade: normalizeUnidade(v.unidade),
        profissional_id: profissional?.id ?? null,
        servico: String(v.servico).trim(),
        valor,
        comissao,
        forma_pagamento: v.forma_pagamento ?? 'dinheiro',
        observacao: v.observacao ?? null,
      };
    });

    // ── Preparar gastos
    const gastosPreparados = gastos.map((g) => ({
      data: normalizeDate(g.data),
      unidade: normalizeUnidade(g.unidade),
      categoria: String(g.categoria).toLowerCase().trim(),
      descricao: String(g.descricao).trim(),
      valor: parseFloat(g.valor),
      observacao: g.observacao ?? null,
    }));

    // ── Persistir (transação por grupo)
    const [vendasInseridas, gastosInseridos] = await Promise.all([
      vendasPreparadas.length ? Venda.bulkCreate(vendasPreparadas) : [],
      gastosPreparados.length ? Gasto.bulkCreate(gastosPreparados) : [],
    ]);

    res.status(201).json({
      mensagem: 'Importação concluída com sucesso.',
      resumo: {
        vendas_importadas: vendasInseridas.length,
        gastos_importados: gastosInseridos.length,
      },
    });
  } catch (err) {
    console.error('Erro na importação:', err);
    res.status(500).json({ erro: 'Falha na importação.', detalhe: err.message });
  }
});

module.exports = router;
