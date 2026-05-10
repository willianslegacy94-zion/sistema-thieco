/**
 * RBAC:
 *   GET /relatorios/fluxo-caixa  → admin
 *   GET /relatorios/dre           → admin
 *   GET /relatorios/comissoes     → todos autenticados
 *     └─ admin: dados completos de todos
 *     └─ barbeiro: ranking com valores próprios expostos, alheios mascarados
 */

const { Router } = require('express');
const { query: qv, validationResult } = require('express-validator');
const { query } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = Router();

const periodoValidators = [
  qv('inicio').notEmpty().isDate().withMessage('inicio obrigatório (YYYY-MM-DD)'),
  qv('fim').notEmpty().isDate().withMessage('fim obrigatório (YYYY-MM-DD)'),
  qv('unidade').optional().isIn(['tambore', 'mutinga']),
];

function toNum(v) { return parseFloat(v ?? 0); }

// ─── Fluxo de Caixa — admin ───────────────────────────────────────────────────
router.get('/fluxo-caixa', authenticate, requireAdmin, periodoValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

  const { inicio, fim, unidade } = req.query;
  const unidadeFiltro = unidade ? `AND unidade = '${unidade}'` : '';

  try {
    const entradasQ = await query(`
      SELECT data, unidade,
        SUM(valor)    AS total_bruto,
        SUM(comissao) AS total_comissao,
        COUNT(*)      AS qtd_vendas
      FROM vendas
      WHERE data BETWEEN $1 AND $2 ${unidadeFiltro}
      GROUP BY data, unidade ORDER BY data
    `, [inicio, fim]);

    const saidasQ = await query(`
      SELECT data, unidade,
        SUM(valor) AS total_gastos,
        COUNT(*)   AS qtd_gastos
      FROM gastos
      WHERE data BETWEEN $1 AND $2 ${unidadeFiltro}
      GROUP BY data, unidade ORDER BY data
    `, [inicio, fim]);

    const totaisEntrada = await query(`
      SELECT SUM(valor) AS receita_bruta, SUM(comissao) AS total_comissoes, SUM(desconto) AS total_descontos
      FROM vendas WHERE data BETWEEN $1 AND $2 ${unidadeFiltro}
    `, [inicio, fim]);

    const totaisSaida = await query(`
      SELECT SUM(valor) AS total_gastos FROM gastos
      WHERE data BETWEEN $1 AND $2 ${unidadeFiltro}
    `, [inicio, fim]);

    const receitaBruta    = toNum(totaisEntrada.rows[0].receita_bruta);
    const totalComissoes  = toNum(totaisEntrada.rows[0].total_comissoes);
    const totalDescontos  = toNum(totaisEntrada.rows[0].total_descontos);
    const totalGastos     = toNum(totaisSaida.rows[0].total_gastos);
    const receitaLiquida  = receitaBruta - totalComissoes;
    const saldoPeriodo    = receitaLiquida - totalGastos;
    const pctDesconto     = (receitaBruta + totalDescontos) > 0
      ? parseFloat(((totalDescontos / (receitaBruta + totalDescontos)) * 100).toFixed(2))
      : 0;

    res.json({
      periodo: { inicio, fim, unidade: unidade ?? 'todas' },
      totais: {
        receita_bruta: receitaBruta, total_comissoes: totalComissoes,
        receita_liquida: receitaLiquida, total_gastos: totalGastos, saldo_periodo: saldoPeriodo,
        total_descontos: totalDescontos, pct_desconto: pctDesconto,
      },
      entradas_por_dia: entradasQ.rows,
      saidas_por_dia:   saidasQ.rows,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── DRE — admin ─────────────────────────────────────────────────────────────
router.get('/dre', authenticate, requireAdmin, periodoValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

  const { inicio, fim, unidade } = req.query;
  const unidadeFiltro = unidade ? `AND unidade = '${unidade}'` : '';

  try {
    const receitasPorServico = await query(`
      SELECT servico, unidade, COUNT(*) AS qtd, SUM(valor) AS total_bruto, SUM(comissao) AS total_comissao
      FROM vendas WHERE data BETWEEN $1 AND $2 ${unidadeFiltro}
      GROUP BY servico, unidade ORDER BY total_bruto DESC
    `, [inicio, fim]);

    const receitasPorPagamento = await query(`
      SELECT forma_pagamento, unidade, COUNT(*) AS qtd, SUM(valor) AS total
      FROM vendas WHERE data BETWEEN $1 AND $2 ${unidadeFiltro}
      GROUP BY forma_pagamento, unidade ORDER BY total DESC
    `, [inicio, fim]);

    const gastosPorCategoria = await query(`
      SELECT categoria, unidade, COUNT(*) AS qtd, SUM(valor) AS total
      FROM gastos WHERE data BETWEEN $1 AND $2 ${unidadeFiltro}
      GROUP BY categoria, unidade ORDER BY total DESC
    `, [inicio, fim]);

    const comissoesPorProfissional = await query(`
      SELECT p.nome AS profissional, v.unidade, COUNT(*) AS qtd_atendimentos,
             SUM(v.valor) AS faturamento_gerado, SUM(v.comissao) AS comissao_total
      FROM vendas v LEFT JOIN profissionais p ON p.id = v.profissional_id
      WHERE v.data BETWEEN $1 AND $2 ${unidadeFiltro.replace(/unidade/g, 'v.unidade')}
      GROUP BY p.nome, v.unidade ORDER BY faturamento_gerado DESC
    `, [inicio, fim]);

    const totaisV = await query(`
      SELECT SUM(valor) AS receita_bruta, SUM(comissao) AS comissoes
      FROM vendas WHERE data BETWEEN $1 AND $2 ${unidadeFiltro}
    `, [inicio, fim]);

    const totaisG = await query(`
      SELECT SUM(valor) AS gastos_totais FROM gastos
      WHERE data BETWEEN $1 AND $2 ${unidadeFiltro}
    `, [inicio, fim]);

    const receitaBruta         = toNum(totaisV.rows[0].receita_bruta);
    const totalComissoes       = toNum(totaisV.rows[0].comissoes);
    const receitaLiquida       = receitaBruta - totalComissoes;
    const gastosTotais         = toNum(totaisG.rows[0].gastos_totais);
    const resultadoOperacional = receitaLiquida - gastosTotais;
    const margemBruta          = receitaBruta > 0
      ? parseFloat(((resultadoOperacional / receitaBruta) * 100).toFixed(2))
      : 0;

    res.json({
      periodo: { inicio, fim, unidade: unidade ?? 'todas' },
      dre: {
        '1_receita_bruta':         receitaBruta,
        '2_deducoes_comissoes':    -totalComissoes,
        '3_receita_liquida':       receitaLiquida,
        '4_gastos_operacionais':   -gastosTotais,
        '5_resultado_operacional': resultadoOperacional,
        '6_margem_bruta_pct':      margemBruta,
      },
      detalhes: {
        receitas_por_servico:         receitasPorServico.rows,
        receitas_por_forma_pagamento: receitasPorPagamento.rows,
        gastos_por_categoria:         gastosPorCategoria.rows,
        comissoes_por_profissional:   comissoesPorProfissional.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── Comissões — todos (com mascaramento para barbeiros) ──────────────────────
router.get('/comissoes', authenticate, periodoValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

  const { inicio, fim, unidade } = req.query;
  const unidadeFiltro = unidade ? `AND v.unidade = '${unidade}'` : '';

  try {
    const { rows } = await query(`
      SELECT
        p.id,
        p.nome,
        p.percentual_comissao,
        v.unidade,
        COUNT(v.id)            AS qtd_atendimentos,
        SUM(v.valor)           AS faturamento_bruto,
        SUM(v.comissao)        AS comissao_total,
        ROUND(AVG(v.valor), 2) AS ticket_medio
      FROM vendas v
      INNER JOIN profissionais p ON p.id = v.profissional_id
      WHERE v.data BETWEEN $1 AND $2 ${unidadeFiltro}
      GROUP BY p.id, p.nome, p.percentual_comissao, v.unidade
      ORDER BY faturamento_bruto DESC
    `, [inicio, fim]);

    const isAdmin    = req.user.role === 'admin';
    const myProfId   = req.user.profissional_id;

    // Barbeiro: retorna ranking completo mas mascara valores alheios
    const comissoes = rows.map((r, idx) => {
      const isOwn = parseInt(r.id) === myProfId;
      if (isAdmin || isOwn) {
        return { ...r, posicao: idx + 1, is_proprio: isOwn };
      }
      return {
        id:                   r.id,
        nome:                 r.nome,
        unidade:              r.unidade,
        posicao:              idx + 1,
        qtd_atendimentos:     null,
        faturamento_bruto:    null,
        comissao_total:       null,
        ticket_medio:         null,
        percentual_comissao:  null,
        is_proprio:           false,
      };
    });

    res.json({ periodo: { inicio, fim, unidade: unidade ?? 'todas' }, comissoes });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── Inteligência Financeira — admin ─────────────────────────────────────────
router.get('/inteligencia', authenticate, requireAdmin, periodoValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

  const { inicio, fim, unidade } = req.query;
  const uf  = unidade ? `AND unidade = '${unidade}'`   : '';
  const ufv = unidade ? `AND v.unidade = '${unidade}'` : '';

  try {
    // ── 1. Vendas diárias agrupadas (para projeção no frontend) ───────────────
    const vendasDiarias = await query(`
      SELECT data::text, ROUND(SUM(valor), 2) AS total
      FROM vendas WHERE data BETWEEN $1 AND $2 ${uf}
      GROUP BY data ORDER BY data
    `, [inicio, fim]);

    // ── 2. Break-even ─────────────────────────────────────────────────────────
    const gastosTotaisQ = await query(`
      SELECT COALESCE(ROUND(SUM(valor), 2), 0) AS total
      FROM gastos WHERE data BETWEEN $1 AND $2 ${uf}
    `, [inicio, fim]);

    const faturamentoCumulativo = await query(`
      SELECT data::text,
             ROUND(SUM(SUM(valor)) OVER (ORDER BY data), 2) AS acumulado
      FROM vendas WHERE data BETWEEN $1 AND $2 ${uf}
      GROUP BY data ORDER BY data
    `, [inicio, fim]);

    const gastosTotais    = toNum(gastosTotaisQ.rows[0].total);
    const rows_fat        = faturamentoCumulativo.rows;
    const faturamentoAtual = rows_fat.length > 0
      ? toNum(rows_fat[rows_fat.length - 1].acumulado)
      : 0;

    // Dia em que o faturamento acumulado cobriu os gastos
    let diaBreakEven = null;
    for (const row of rows_fat) {
      if (toNum(row.acumulado) >= gastosTotais && gastosTotais > 0) {
        diaBreakEven = row.data;
        break;
      }
    }

    // Projeção do break-even futuro (se não atingiu)
    let diaBreakEvenProjetado = null;
    if (!diaBreakEven && rows_fat.length > 0 && gastosTotais > 0) {
      const mediaDiaria = faturamentoAtual / rows_fat.length;
      if (mediaDiaria > 0) {
        const diasNecessarios = Math.ceil((gastosTotais - faturamentoAtual) / mediaDiaria);
        const dataProjetada = new Date(rows_fat[rows_fat.length - 1].data + 'T00:00:00');
        dataProjetada.setDate(dataProjetada.getDate() + diasNecessarios);
        const projetada = dataProjetada.toISOString().slice(0, 10);
        if (projetada <= fim) diaBreakEvenProjetado = projetada;
      }
    }

    // ── 3. Ticket médio por barbeiro ──────────────────────────────────────────
    const ticketBarbeiros = await query(`
      SELECT p.id, p.nome, p.unidade,
             COUNT(v.id)::int              AS qtd_atendimentos,
             ROUND(AVG(v.valor), 2)        AS ticket_medio,
             ROUND(SUM(v.valor), 2)        AS faturamento_bruto,
             ROUND(SUM(v.comissao), 2)     AS comissao_total
      FROM vendas v
      INNER JOIN profissionais p ON p.id = v.profissional_id
      WHERE v.data BETWEEN $1 AND $2 ${ufv}
      GROUP BY p.id, p.nome, p.unidade
      ORDER BY ticket_medio DESC NULLS LAST
    `, [inicio, fim]);

    res.json({
      break_even: {
        gastos_totais:           gastosTotais,
        faturamento_atual:       faturamentoAtual,
        percentual_cobertura:    gastosTotais > 0
          ? parseFloat(((faturamentoAtual / gastosTotais) * 100).toFixed(1))
          : 100,
        dia_break_even:          diaBreakEven,
        dia_break_even_projetado: diaBreakEvenProjetado,
        ja_atingiu:              faturamentoAtual >= gastosTotais && gastosTotais > 0,
      },
      ticket_medio_barbeiros: ticketBarbeiros.rows,
      vendas_por_dia:         vendasDiarias.rows,
    });
  } catch (err) {
    console.error('Erro em /inteligencia:', err);
    res.status(500).json({ erro: err.message });
  }
});

// ─── Resumo Operador — operador ou admin ─────────────────────────────────────
router.get('/resumo-operador', authenticate, periodoValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

  const { role, unidade: unidadeJWT } = req.user;
  if (role !== 'admin' && role !== 'operador')
    return res.status(403).json({ erro: 'Acesso negado.' });

  const { inicio, fim } = req.query;
  // Operador sempre vê apenas sua unidade; admin pode filtrar
  const unidade = role === 'operador' ? unidadeJWT : (req.query.unidade ?? null);
  const uf = unidade ? `AND unidade = '${unidade}'` : '';

  try {
    const totalDia = await query(`
      SELECT COALESCE(SUM(valor), 0) AS total, COUNT(*) AS qtd
      FROM vendas WHERE data = CURRENT_DATE ${uf}
    `);

    const totalMes = await query(`
      SELECT COALESCE(SUM(valor), 0) AS total, COUNT(*) AS qtd
      FROM vendas WHERE data BETWEEN $1 AND $2 ${uf}
    `, [inicio, fim]);

    const servicosPopulares = await query(`
      SELECT servico, COUNT(*) AS qtd, SUM(valor) AS total
      FROM vendas WHERE data BETWEEN $1 AND $2 ${uf}
      GROUP BY servico ORDER BY qtd DESC LIMIT 8
    `, [inicio, fim]);

    const vendasPorDia = await query(`
      SELECT data::text, COUNT(*) AS qtd, SUM(valor) AS total
      FROM vendas WHERE data BETWEEN $1 AND $2 ${uf}
      GROUP BY data ORDER BY data
    `, [inicio, fim]);

    res.json({
      periodo: { inicio, fim, unidade: unidade ?? 'todas' },
      hoje: { total: toNum(totalDia.rows[0].total), qtd: parseInt(totalDia.rows[0].qtd) },
      mes:  { total: toNum(totalMes.rows[0].total), qtd: parseInt(totalMes.rows[0].qtd) },
      servicos_populares: servicosPopulares.rows,
      vendas_por_dia:     vendasPorDia.rows,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
