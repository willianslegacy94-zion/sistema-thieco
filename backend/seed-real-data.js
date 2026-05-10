/**
 * Seed com dados reais — Barbearia Thieco Leandro
 * Fonte: Onboarding Zion Ops – Barbearia Thieco Leandro.pdf
 *
 * Roda uma vez:  node seed-real-data.js
 */

require('dotenv').config();
const { query, getClient } = require('./db');

// ─── Tabelas de serviços e preços reais ──────────────────────────────────────

const SERVICOS_MUTINGA = [
  { nome: 'Corte Masculino',                valor: 45 },
  { nome: 'Barba',                           valor: 35 },
  { nome: 'Corte Infantil',                  valor: 45 },
  { nome: 'Sobrancelha',                     valor: 15 },
  { nome: 'Sobrancelha na Cera',             valor: 20 },
  { nome: 'Risco',                           valor: 10 },
  { nome: 'Raspar Barba',                    valor: 20 },
  { nome: 'Raspar Cabelo',                   valor: 30 },
  { nome: 'Pezinho',                         valor: 15 },
  { nome: 'Combo: Corte + Barba',            valor: 80 },
  { nome: 'Combo: Corte + Barba + Sobranc.', valor: 95 },
  { nome: 'Combo: Corte + Limpeza Facial',   valor: 85 },
  { nome: 'Combo: Corte + Hidratação',       valor: 70 },
  { nome: 'Hidratação Barba',                valor: 20 },
  { nome: 'Hidratação',                      valor: 25 },
  { nome: 'Limpeza Facial',                  valor: 50 },
  { nome: 'Selagem',                         valor: 60 },
  { nome: 'Progressiva',                     valor: 80 },
  { nome: 'Depilação Nariz',                 valor: 15 },
  { nome: 'Depilação Orelha',                valor: 15 },
  { nome: 'Depilação Nariz + Orelha',        valor: 30 },
  { nome: 'Luzes',                           valor: 130 },
  { nome: 'Platinado',                       valor: 200 },
  { nome: 'Dia de Princeso',                 valor: 140 },
];

const SERVICOS_TAMBORE = [
  { nome: 'Corte',                    valor: 70  },
  { nome: 'Barba',                    valor: 60  },
  { nome: 'Combo: Corte + Barba',     valor: 130 },
  { nome: 'Sobrancelha',              valor: 20  },
  { nome: 'Pezinho / Acabamento',     valor: 20  },
  { nome: 'Raspar Cabelo',            valor: 50  },
  { nome: 'Hidratação',               valor: 30  },
  { nome: 'Limpeza Facial',           valor: 50  },
  { nome: 'Selagem',                  valor: 80  },
  { nome: 'Progressiva',              valor: 120 },
  { nome: 'Luzes',                    valor: 150 },
  { nome: 'Platinado',                valor: 250 },
];

// Pesos para escolha aleatória de serviços (mais cortes e combos do dia a dia)
const PESOS_MUTINGA  = [20, 12, 5, 6, 3, 2, 2, 2, 3, 15, 6, 4, 4, 2, 2, 3, 2, 2, 1, 1, 1, 2, 1, 1];
const PESOS_TAMBORE  = [25, 15, 20, 4, 3, 2, 3, 3, 4, 3, 2, 1];

const FORMAS = [
  { v: 'pix',      w: 45 },
  { v: 'dinheiro', w: 30 },
  { v: 'credito',  w: 15 },
  { v: 'debito',   w: 10 },
];

function escolher(arr, pesos) {
  const total = pesos.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= pesos[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function pagamento() {
  return escolher(FORMAS, FORMAS.map(f => f.w)).v;
}

// Dias úteis: Terça–Sábado (0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sáb)
function isDiaUtil(date) {
  const d = date.getDay();
  return d >= 2 && d <= 6; // ter–sáb
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

// Gera atendimentos para um dia com variação realista
function gerarVendasDia(profissionalId, unidade, data) {
  const servicos = unidade === 'mutinga' ? SERVICOS_MUTINGA : SERVICOS_TAMBORE;
  const pesos    = unidade === 'mutinga' ? PESOS_MUTINGA    : PESOS_TAMBORE;

  // Terça–Quinta: 6–10 atend.; Sexta–Sábado: 9–14 atend.
  const diaSemana = data.getDay();
  const isFinSem  = diaSemana === 5 || diaSemana === 6;
  const min = isFinSem ? 9 : 5;
  const max = isFinSem ? 14 : 10;
  const qtd = Math.floor(Math.random() * (max - min + 1)) + min;

  const vendas = [];
  for (let i = 0; i < qtd; i++) {
    const serv    = escolher(servicos, pesos);
    const perc    = unidade === 'mutinga' ? 40 : 50;
    const comissao = parseFloat(((perc / 100) * serv.valor).toFixed(2));
    vendas.push({
      unidade,
      profissional_id: profissionalId,
      servico:         serv.nome,
      valor:           serv.valor,
      comissao,
      forma_pagamento: pagamento(),
      data:            isoDate(data),
    });
  }
  return vendas;
}

// ─── Gastos mensais fixos + variáveis ────────────────────────────────────────

function gastosDoMes(ano, mes) {
  // mes: 1-based
  const mm = String(mes).padStart(2, '0');
  const d1 = `${ano}-${mm}-01`;
  const d5 = `${ano}-${mm}-05`;
  const d10 = `${ano}-${mm}-10`;
  const d15 = `${ano}-${mm}-15`;
  const d20 = `${ano}-${mm}-20`;

  return [
    // ── Mutinga ──
    { unidade: 'mutinga', categoria: 'Aluguel',          descricao: 'Aluguel mensal — Mutinga',       valor: 2500.00, data: d1  },
    { unidade: 'mutinga', categoria: 'Produtos',         descricao: 'Reposição de produtos barba/cabelo', valor: 480.00, data: d5  },
    { unidade: 'mutinga', categoria: 'Energia',          descricao: 'Conta de energia elétrica',      valor: 320.00, data: d10 },
    { unidade: 'mutinga', categoria: 'Internet',         descricao: 'Internet + telefone',             valor: 180.00, data: d10 },
    { unidade: 'mutinga', categoria: 'Material Limpeza', descricao: 'Material de limpeza',             valor: 150.00, data: d5  },
    { unidade: 'mutinga', categoria: 'Manutenção',       descricao: 'Manutenção equipamentos',         valor: Math.random() > 0.6 ? 200.00 : 0, data: d15 },
    { unidade: 'mutinga', categoria: 'Marketing',        descricao: 'Impulsionamento Instagram',       valor: 150.00, data: d1  },
    // ── Tamboré ──
    { unidade: 'tambore', categoria: 'Aluguel',          descricao: 'Aluguel mensal — Tamboré',       valor: 4500.00, data: d1  },
    { unidade: 'tambore', categoria: 'Produtos',         descricao: 'Reposição de produtos premium',  valor: 750.00, data: d5  },
    { unidade: 'tambore', categoria: 'Energia',          descricao: 'Conta de energia elétrica',      valor: 450.00, data: d10 },
    { unidade: 'tambore', categoria: 'Internet',         descricao: 'Internet + telefone',             valor: 200.00, data: d10 },
    { unidade: 'tambore', categoria: 'Material Limpeza', descricao: 'Material de limpeza',             valor: 180.00, data: d5  },
    { unidade: 'tambore', categoria: 'Marketing',        descricao: 'Impulsionamento redes sociais',   valor: 200.00, data: d1  },
    { unidade: 'tambore', categoria: 'Manutenção',       descricao: 'Manutenção cadeira/equipamentos', valor: Math.random() > 0.5 ? 350.00 : 0, data: d20 },
  ].filter(g => g.valor > 0);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════');
  console.log(' Seed de dados reais — Barbearia Thieco Leandro');
  console.log('═══════════════════════════════════════════════\n');

  // ── 1. Corrigir nomes dos profissionais ──────────────────────────────────────
  console.log('1. Atualizando profissionais...');
  await query(`UPDATE profissionais SET nome = 'Igor Hidalgo',   unidade = 'mutinga' WHERE nome = 'Igor'`);
  await query(`UPDATE profissionais SET nome = 'Kauã dos Santos'                     WHERE nome = 'Kauã'`);

  // Marcos Fernandes (Mutinga)
  await query(`
    INSERT INTO profissionais (nome, unidade, percentual_comissao)
    VALUES ('Marcos Fernandes', 'mutinga', 40.00)
    ON CONFLICT (nome) DO NOTHING
  `);

  const { rows: profs } = await query(`SELECT id, nome, unidade FROM profissionais ORDER BY id`);
  console.log('   Profissionais:');
  profs.forEach(p => console.log(`   • ${p.id} — ${p.nome} (${p.unidade})`));

  // Mapear IDs
  const getProfId = (nomeParcial) =>
    profs.find(p => p.nome.toLowerCase().includes(nomeParcial.toLowerCase()))?.id;

  const thiecoId  = getProfId('thieco');
  const igorId    = getProfId('igor');
  const kauaId    = getProfId('kauã');
  const marcosId  = getProfId('marcos');

  console.log(`   IDs: Thieco=${thiecoId}, Igor=${igorId}, Kauã=${kauaId}, Marcos=${marcosId}`);

  // ── 2. Limpar todos os dados anteriores (vendas e gastos) ───────────────────
  console.log('\n2. Limpando todos os dados...');
  await query(`DELETE FROM vendas`);
  await query(`DELETE FROM gastos`);
  console.log('   Tabelas de vendas e gastos limpas.');

  // ── 3. Gerar vendas — Março, Abril, Maio 2026 ────────────────────────────────
  console.log('\n3. Gerando vendas (Mar–Mai 2026)...');

  const periodos = [
    { ano: 2026, mes: 3,  diasAte: 31 },
    { ano: 2026, mes: 4,  diasAte: 30 },
    { ano: 2026, mes: 5,  diasAte: 3  }, // até hoje
  ];

  let totalVendas = 0;
  let totalFaturamento = 0;

  const barbers = [
    { id: igorId,   unidade: 'mutinga' },
    { id: kauaId,   unidade: 'mutinga' },
    { id: marcosId, unidade: 'mutinga' },
    { id: thiecoId, unidade: 'tambore' },
  ].filter(b => b.id != null);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (const { ano, mes, diasAte } of periodos) {
      const inicio = new Date(ano, mes - 1, 1);
      let vendasMes = 0;

      for (let d = 0; d < diasAte; d++) {
        const dia = addDays(inicio, d);
        if (!isDiaUtil(dia)) continue;

        for (const barber of barbers) {
          // Tamboré: apenas dias específicos (menos movimento, Thieco atende sozinho)
          if (barber.unidade === 'tambore' && Math.random() > 0.85) continue;

          const vendas = gerarVendasDia(barber.id, barber.unidade, dia);
          for (const v of vendas) {
            await client.query(
              `INSERT INTO vendas (unidade, profissional_id, servico, valor, comissao, forma_pagamento, data, importado)
               VALUES ($1,$2,$3,$4,$5,$6,$7, true)`,
              [v.unidade, v.profissional_id, v.servico, v.valor, v.comissao, v.forma_pagamento, v.data]
            );
            vendasMes++;
            totalFaturamento += v.valor;
          }
        }
      }
      totalVendas += vendasMes;
      console.log(`   ${ano}-${String(mes).padStart(2,'0')}: ${vendasMes} atendimentos`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(`   Total: ${totalVendas} vendas | Faturamento aprox.: R$ ${totalFaturamento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);

  // ── 4. Gerar gastos — Março, Abril, Maio 2026 ────────────────────────────────
  console.log('\n4. Inserindo gastos (Mar–Mai 2026)...');

  let totalGastos = 0;
  for (const { ano, mes } of periodos) {
    const gastos = gastosDoMes(ano, mes);
    for (const g of gastos) {
      await query(
        `INSERT INTO gastos (unidade, categoria, descricao, valor, data, importado)
         VALUES ($1,$2,$3,$4,$5, true)`,
        [g.unidade, g.categoria, g.descricao, g.valor, g.data]
      );
      totalGastos += g.valor;
    }
    console.log(`   ${ano}-${String(mes).padStart(2,'0')}: ${gastos.length} lançamentos de gastos`);
  }
  console.log(`   Total gastos: R$ ${totalGastos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);

  // ── 5. Resumo final ──────────────────────────────────────────────────────────
  const { rows: resumo } = await query(`
    SELECT
      (SELECT COUNT(*)          FROM vendas)  AS total_vendas,
      (SELECT ROUND(SUM(valor),2) FROM vendas)  AS faturamento,
      (SELECT COUNT(*)          FROM gastos)  AS total_gastos,
      (SELECT ROUND(SUM(valor),2) FROM gastos)  AS total_desp
  `);
  const r = resumo[0];
  console.log('\n═══════════════════════════════════════════════');
  console.log(' Resumo do banco após seed:');
  console.log(`   Vendas:       ${r.total_vendas} atendimentos`);
  console.log(`   Faturamento:  R$ ${parseFloat(r.faturamento).toLocaleString('pt-BR', {minimumFractionDigits:2})}`);
  console.log(`   Gastos:       ${r.total_gastos} lançamentos`);
  console.log(`   Despesas:     R$ ${parseFloat(r.total_desp).toLocaleString('pt-BR', {minimumFractionDigits:2})}`);
  console.log('═══════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch(err => {
  console.error('\nErro no seed:', err.message);
  process.exit(1);
});
