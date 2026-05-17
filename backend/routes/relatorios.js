/**
 * RBAC:
 *   GET /relatorios/fluxo-caixa  → admin
 *   GET /relatorios/dre           → admin
 *   GET /relatorios/comissoes     → todos autenticados
 *     └─ admin: dados completos de todos
 *     └─ barbeiro: ranking com valores próprios expostos, alheios mascarados
 */

const { Router } = require('express');
const { query: qv } = require('express-validator');
const { query } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = Router();

// Valida datas opcionalmente — em vez de 422, faz fallback para o mês atual
// { values: 'falsy' } trata string vazia como ausente, evitando 422 durante edição manual
const periodoValidators = [
  qv('inicio').optional({ values: 'falsy' }).isDate(),
  qv('fim').optional({ values: 'falsy' }).isDate(),
  qv('unidade').optional().isIn(['tambore', 'mutinga']),
  qv('profissional_id').optional({ values: 'falsy' }).isInt({ min: 1 }),
];

function toNum(v) { return parseFloat(v ?? 0); }

// Retorna datas válidas ou o dia atual como fallback
function resolverPeriodo(params) {
  const _d = new Date();
  const hoje = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;

  function isValidDate(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T00:00:00');
    if (isNaN(d.getTime())) return false;
    return d.toISOString().slice(0, 10) === s;
  }

  return {
    inicio:  isValidDate(params.inicio) ? params.inicio : hoje,
    fim:     isValidDate(params.fim)    ? params.fim    : hoje,
    unidade: params.unidade ?? null,
  };
}

// ─── Taxas de intermediação PagBank (maquininha) ──────────────────────────────
// Fonte: app PagBank → Maquininhas → Taxas personalizadas (capturado em mai/2026)
const TAXAS_PAGBANK = {
  debito:   0.0119,   // 1,19% — Débito Visa/Master/Elo, recebimento na hora
  credito:  0.0349,   // 3,49% — Crédito à vista, recebimento na hora
  pix:      0,        // PagBank Pix — isento
  dinheiro: 0,
  cortesia: 0,
};

// SQL CASE que calcula o valor da taxa por linha de venda
const TAXA_SQL_CASE = `valor * CASE forma_pagamento
  WHEN 'debito'  THEN 0.0119
  WHEN 'credito' THEN 0.0349
  ELSE 0
END`;

// ─── Fluxo de Caixa — admin ───────────────────────────────────────────────────
router.get('/fluxo-caixa', authenticate, requireAdmin, periodoValidators, async (req, res) => {
  const { inicio, fim, unidade } = resolverPeriodo(req.query);
  const profId = req.query.profissional_id ? parseInt(req.query.profissional_id) : null;

  const uf   = unidade ? `AND unidade = '${unidade}'`         : '';
  const pfv  = profId  ? `AND profissional_id = ${profId}`    : '';

  try {
    const entradasQ = await query(`
      SELECT data, unidade,
        SUM(valor)                                               AS total_bruto,
        SUM(comissao)                                            AS total_comissao,
        COUNT(DISTINCT COALESCE(venda_origem_id, id))            AS qtd_vendas
      FROM vendas
      WHERE data BETWEEN $1 AND $2 ${uf} ${pfv}
      GROUP BY data, unidade ORDER BY data
    `, [inicio, fim]);

    const saidasQ = await query(`
      SELECT data, unidade,
        SUM(valor) AS total_gastos,
        COUNT(*)   AS qtd_gastos
      FROM gastos
      WHERE data BETWEEN $1 AND $2 ${uf}
      GROUP BY data, unidade ORDER BY data
    `, [inicio, fim]);

    const totaisEntrada = await query(`
      SELECT
        SUM(valor)             AS receita_bruta,
        SUM(comissao_servico)  AS total_comissao_servico,
        SUM(comissao_produto)  AS total_comissao_produto,
        SUM(comissao)          AS total_comissoes,
        SUM(desconto)          AS total_descontos,
        COUNT(DISTINCT COALESCE(venda_origem_id, id)) AS total_atendimentos
      FROM vendas WHERE data BETWEEN $1 AND $2 ${uf} ${pfv}
    `, [inicio, fim]);

    const totaisSaida = await query(`
      SELECT SUM(valor) AS total_gastos FROM gastos
      WHERE data BETWEEN $1 AND $2 ${uf}
    `, [inicio, fim]);

    const taxaQ = await query(`
      SELECT COALESCE(ROUND(SUM(${TAXA_SQL_CASE}), 2), 0) AS taxa_pagbank
      FROM vendas WHERE data BETWEEN $1 AND $2 ${uf} ${pfv}
    `, [inicio, fim]);

    const r = totaisEntrada.rows[0];
    const receitaBruta   = toNum(r.receita_bruta);
    const totalComissoes = toNum(r.total_comissoes);
    const totalDescontos = toNum(r.total_descontos);
    const atendimentos   = parseInt(r.total_atendimentos || 0);
    const totalGastos    = toNum(totaisSaida.rows[0].total_gastos);
    const taxaPagBank    = toNum(taxaQ.rows[0].taxa_pagbank);
    const receitaLiquida = receitaBruta - totalComissoes;
    const saldoPeriodo   = receitaLiquida - taxaPagBank - totalGastos;
    const pctDesconto    = (receitaBruta + totalDescontos) > 0
      ? parseFloat(((totalDescontos / (receitaBruta + totalDescontos)) * 100).toFixed(2))
      : 0;
    const ticketMedio    = atendimentos > 0
      ? parseFloat((receitaBruta / atendimentos).toFixed(2))
      : 0;

    res.json({
      periodo: { inicio, fim, unidade: unidade ?? 'todas', profissional_id: profId },
      totais: {
        receita_bruta:          receitaBruta,
        total_comissoes:        totalComissoes,
        total_comissao_servico: toNum(r.total_comissao_servico),
        total_comissao_produto: toNum(r.total_comissao_produto),
        receita_liquida:        receitaLiquida,
        taxa_pagbank:           taxaPagBank,
        total_gastos:           totalGastos,
        saldo_periodo:          saldoPeriodo,
        total_descontos:        totalDescontos,
        pct_desconto:           pctDesconto,
        atendimentos,
        ticket_medio:           ticketMedio,
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
  const { inicio, fim, unidade } = resolverPeriodo(req.query);
  const profId = req.query.profissional_id ? parseInt(req.query.profissional_id) : null;

  const uf   = unidade ? `AND unidade = '${unidade}'`      : '';
  const ufv  = unidade ? `AND v.unidade = '${unidade}'`    : '';
  const pfv  = profId  ? `AND v.profissional_id = ${profId}` : '';
  const pf   = profId  ? `AND profissional_id = ${profId}` : '';

  try {
    const receitasPorServico = await query(`
      SELECT servico, unidade,
        COUNT(DISTINCT COALESCE(venda_origem_id, id)) AS qtd,
        SUM(valor) AS total_bruto,
        SUM(comissao_servico) AS comissao_servico,
        SUM(comissao_produto) AS comissao_produto,
        SUM(comissao) AS total_comissao
      FROM vendas WHERE data BETWEEN $1 AND $2 ${uf} ${pf}
      GROUP BY servico, unidade ORDER BY total_bruto DESC
    `, [inicio, fim]);

    const receitasPorPagamento = await query(`
      SELECT forma_pagamento, unidade, COUNT(*) AS qtd, SUM(valor) AS total
      FROM vendas WHERE data BETWEEN $1 AND $2 ${uf} ${pf}
      GROUP BY forma_pagamento, unidade ORDER BY total DESC
    `, [inicio, fim]);

    const gastosPorCategoria = await query(`
      SELECT categoria, unidade, COUNT(*) AS qtd, SUM(valor) AS total
      FROM gastos WHERE data BETWEEN $1 AND $2 ${uf}
      GROUP BY categoria, unidade ORDER BY total DESC
    `, [inicio, fim]);

    const comissoesPorProfissional = await query(`
      SELECT p.nome AS profissional, v.unidade,
        COUNT(DISTINCT COALESCE(v.venda_origem_id, v.id)) AS qtd_atendimentos,
        SUM(v.valor)            AS faturamento_gerado,
        SUM(v.comissao_servico) AS comissao_servico,
        SUM(v.comissao_produto) AS comissao_produto,
        SUM(v.comissao)         AS comissao_total
      FROM vendas v LEFT JOIN profissionais p ON p.id = v.profissional_id AND p.ativo = true
      WHERE v.data BETWEEN $1 AND $2 ${ufv} ${pfv}
      GROUP BY p.nome, v.unidade ORDER BY faturamento_gerado DESC
    `, [inicio, fim]);

    const totaisV = await query(`
      SELECT SUM(valor)            AS receita_bruta,
             SUM(comissao_servico) AS comissao_servico,
             SUM(comissao_produto) AS comissao_produto,
             SUM(comissao)         AS comissoes,
             COUNT(DISTINCT COALESCE(venda_origem_id, id)) AS atendimentos
      FROM vendas WHERE data BETWEEN $1 AND $2 ${uf} ${pf}
    `, [inicio, fim]);

    const totaisG = await query(`
      SELECT SUM(valor) AS gastos_totais FROM gastos
      WHERE data BETWEEN $1 AND $2 ${uf}
    `, [inicio, fim]);

    const taxaDetalheQ = await query(`
      SELECT forma_pagamento,
        COUNT(*)::int                                                AS qtd,
        ROUND(SUM(valor), 2)                                         AS volume,
        ROUND(SUM(${TAXA_SQL_CASE}), 2)                              AS taxa,
        ROUND(SUM(${TAXA_SQL_CASE}) / NULLIF(SUM(valor),0)*100, 2)  AS taxa_pct_efetiva
      FROM vendas WHERE data BETWEEN $1 AND $2 ${uf} ${pf}
      GROUP BY forma_pagamento ORDER BY volume DESC
    `, [inicio, fim]);

    const tv = totaisV.rows[0];
    const receitaBruta         = toNum(tv.receita_bruta);
    const totalComissoes       = toNum(tv.comissoes);
    const atendimentos         = parseInt(tv.atendimentos || 0);
    const gastosTotais         = toNum(totaisG.rows[0].gastos_totais);
    const taxaPagBank          = taxaDetalheQ.rows.reduce((s, r) => s + toNum(r.taxa), 0);
    const receitaLiquida       = receitaBruta - totalComissoes - taxaPagBank;
    const resultadoOperacional = receitaLiquida - gastosTotais;
    const margemBruta          = receitaBruta > 0
      ? parseFloat(((resultadoOperacional / receitaBruta) * 100).toFixed(2))
      : 0;
    const ticketMedio          = atendimentos > 0
      ? parseFloat((receitaBruta / atendimentos).toFixed(2))
      : 0;

    res.json({
      periodo: { inicio, fim, unidade: unidade ?? 'todas', profissional_id: profId },
      dre: {
        '1_receita_bruta':         receitaBruta,
        '2_deducoes_comissoes':    -totalComissoes,
        '2a_comissao_servico':     -toNum(tv.comissao_servico),
        '2b_comissao_produto':     -toNum(tv.comissao_produto),
        '3_taxa_pagbank':          -parseFloat(taxaPagBank.toFixed(2)),
        '4_receita_liquida':       receitaLiquida,
        '5_gastos_operacionais':   -gastosTotais,
        '6_resultado_operacional': resultadoOperacional,
        '7_margem_bruta_pct':      margemBruta,
        '8_atendimentos':          atendimentos,
        '9_ticket_medio':          ticketMedio,
      },
      detalhes: {
        receitas_por_servico:         receitasPorServico.rows,
        receitas_por_forma_pagamento: receitasPorPagamento.rows,
        gastos_por_categoria:         gastosPorCategoria.rows,
        comissoes_por_profissional:   comissoesPorProfissional.rows,
        taxas_pagbank_por_pagamento:  taxaDetalheQ.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── Comissões — todos (com mascaramento para barbeiros) ──────────────────────
router.get('/comissoes', authenticate, periodoValidators, async (req, res) => {
  const { inicio, fim, unidade } = resolverPeriodo(req.query);
  const profId = req.query.profissional_id ? parseInt(req.query.profissional_id) : null;

  const ufv = unidade ? `AND v.unidade = '${unidade}'`      : '';
  const pfv = profId  ? `AND v.profissional_id = ${profId}` : '';

  try {
    const { rows } = await query(`
      SELECT
        p.id,
        p.nome,
        p.percentual_comissao,
        v.unidade,
        COUNT(DISTINCT COALESCE(v.venda_origem_id, v.id))   AS qtd_atendimentos,
        SUM(v.valor)                                         AS faturamento_bruto,
        SUM(v.comissao_servico)                              AS comissao_servico,
        SUM(v.comissao_produto)                              AS comissao_produto,
        SUM(v.comissao)                                      AS comissao_total,
        ROUND(
          SUM(v.valor) / NULLIF(COUNT(DISTINCT COALESCE(v.venda_origem_id, v.id)), 0),
        2)                                                   AS ticket_medio
      FROM vendas v
      INNER JOIN profissionais p ON p.id = v.profissional_id AND p.ativo = true
      WHERE v.data BETWEEN $1 AND $2 ${ufv} ${pfv}
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
        comissao_servico:     null,
        comissao_produto:     null,
        comissao_total:       null,
        ticket_medio:         null,
        percentual_comissao:  null,
        is_proprio:           false,
      };
    });

    res.json({
      periodo: { inicio, fim, unidade: unidade ?? 'todas', profissional_id: profId },
      comissoes,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── Inteligência Financeira — admin ─────────────────────────────────────────
router.get('/inteligencia', authenticate, requireAdmin, periodoValidators, async (req, res) => {
  const { inicio, fim, unidade } = resolverPeriodo(req.query);
  const profId = req.query.profissional_id ? parseInt(req.query.profissional_id) : null;

  const uf  = unidade ? `AND unidade = '${unidade}'`      : '';
  const ufv = unidade ? `AND v.unidade = '${unidade}'`    : '';
  const pfv = profId  ? `AND v.profissional_id = ${profId}` : '';
  const pf  = profId  ? `AND profissional_id = ${profId}` : '';

  try {
    // ── 1. Vendas diárias agrupadas (para projeção no frontend) ───────────────
    const vendasDiarias = await query(`
      SELECT data::text, ROUND(SUM(valor), 2) AS total
      FROM vendas WHERE data BETWEEN $1 AND $2 ${uf} ${pf}
      GROUP BY data ORDER BY data
    `, [inicio, fim]);

    // ── 2. Break-even (sempre sobre o total da unidade, sem filtro de profissional) ──
    const gastosTotaisQ = await query(`
      SELECT COALESCE(ROUND(SUM(valor), 2), 0) AS total
      FROM gastos WHERE data BETWEEN $1 AND $2 ${uf}
    `, [inicio, fim]);

    const faturamentoCumulativo = await query(`
      SELECT data::text,
             ROUND(SUM(SUM(valor)) OVER (ORDER BY data), 2) AS acumulado
      FROM vendas WHERE data BETWEEN $1 AND $2 ${uf} ${pf}
      GROUP BY data ORDER BY data
    `, [inicio, fim]);

    const gastosTotais    = toNum(gastosTotaisQ.rows[0].total);
    const rows_fat        = faturamentoCumulativo.rows;
    const faturamentoAtual = rows_fat.length > 0
      ? toNum(rows_fat[rows_fat.length - 1].acumulado)
      : 0;

    let diaBreakEven = null;
    for (const row of rows_fat) {
      if (toNum(row.acumulado) >= gastosTotais && gastosTotais > 0) {
        diaBreakEven = row.data;
        break;
      }
    }

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
        COUNT(DISTINCT COALESCE(v.venda_origem_id, v.id))::int   AS qtd_atendimentos,
        ROUND(
          SUM(v.valor) / NULLIF(COUNT(DISTINCT COALESCE(v.venda_origem_id, v.id)), 0),
        2)                                                         AS ticket_medio,
        ROUND(SUM(v.valor), 2)                                     AS faturamento_bruto,
        ROUND(SUM(v.comissao_servico), 2)                          AS comissao_servico,
        ROUND(SUM(v.comissao_produto), 2)                          AS comissao_produto,
        ROUND(SUM(v.comissao), 2)                                  AS comissao_total
      FROM vendas v
      INNER JOIN profissionais p ON p.id = v.profissional_id AND p.ativo = true
      WHERE v.data BETWEEN $1 AND $2 ${ufv} ${pfv}
      GROUP BY p.id, p.nome, p.unidade
      ORDER BY ticket_medio DESC NULLS LAST
    `, [inicio, fim]);

    res.json({
      periodo: { inicio, fim, unidade: unidade ?? 'todas', profissional_id: profId },
      break_even: {
        gastos_totais:            gastosTotais,
        faturamento_atual:        faturamentoAtual,
        percentual_cobertura:     gastosTotais > 0
          ? parseFloat(((faturamentoAtual / gastosTotais) * 100).toFixed(1))
          : 100,
        dia_break_even:           diaBreakEven,
        dia_break_even_projetado: diaBreakEvenProjetado,
        ja_atingiu:               faturamentoAtual >= gastosTotais && gastosTotais > 0,
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
  const { role, unidade: unidadeJWT } = req.user;
  if (role !== 'admin' && role !== 'operador')
    return res.status(403).json({ erro: 'Acesso negado.' });

  const { inicio, fim } = resolverPeriodo(req.query);
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
