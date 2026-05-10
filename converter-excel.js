/**
 * converter-excel.js
 *
 * Converte os arquivos "Controle de Vendas - XXXX.xlsx" para JSON
 * no formato aceito pelo endpoint POST /import do sistema.
 *
 * Uso:
 *   node converter-excel.js          → converte os 3 arquivos
 *   node converter-excel.js 2025     → converte só o de 2025
 *
 * Saída: import-2024.json, import-2025.json, import-2026.json
 */

const XLSX = require('./backend/node_modules/xlsx');
const fs   = require('fs');
const path = require('path');

// ─── Configuração ────────────────────────────────────────────────────────────

const ARQUIVOS = {
  2024: path.join(__dirname, 'Controle de Vendas - 2024.xlsx'),
  2025: path.join(__dirname, 'Controle de Vendas - 2025.xlsx'),
  2026: path.join(__dirname, 'Controle de Vendas - 2026.xlsx'),
};

// Nomes de abas que NÃO são meses — ignorar
const ABAS_IGNORAR = /relatorio|relatório|realtorio|faturamento|meta|gasto|compra|fechamento|planilha|dashboard/i;

// Nomes dos meses (sem acento para comparação normalizada)
const MESES_NORM = ['janeiro','fevereiro','marco','abril','maio','junho',
                    'julho','agosto','setembro','outubro','novembro','dezembro'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function norm(s) {
  return String(s ?? '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function parseData(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // Número serial do Excel
  if (/^\d{5}$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(Number(s));
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }

  // D/M/YYYY ou DD/MM/YYYY
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  return null;
}

function parseValor(raw) {
  if (raw === null || raw === undefined || raw === false || raw === '') return null;

  let n;
  if (typeof raw === 'number') {
    n = raw;
  } else {
    // String como "R$ 39,04" ou "39,04" ou "39.04"
    const s = String(raw)
      .replace(/R\$\s*/g, '')
      .replace(/\s/g, '')
      .trim();

    // Formato brasileiro: 1.234,56 → 1234.56
    if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) {
      n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    } else {
      n = parseFloat(s.replace(',', '.'));
    }
  }

  if (isNaN(n) || n < 0) return null;

  // Detectar valores em centavos: valores > 10000 num serviço de barbearia são suspeitos
  // Um corte custa no máximo R$ 500, então > 50000 seria em centavos (R$ 500,00 = 50000)
  if (n > 50000) n = n / 100;

  return parseFloat(n.toFixed(2));
}

function normPagamento(raw) {
  if (!raw) return 'dinheiro';
  const s = norm(raw);
  if (s.includes('pix'))                                      return 'pix';
  if (s.includes('dinheiro') || s.includes('especie'))        return 'dinheiro';
  if (s.includes('debito')   || s.includes('debito'))         return 'debito';
  if (s.includes('credito')  || s.includes('visa') ||
      s.includes('master')   || s.includes('elo')  ||
      s.includes('amex'))                                     return 'credito';
  if (s.includes('transfer') || s.includes('ted') ||
      s.includes('doc'))                                      return 'pix';
  return 'dinheiro';
}

function normTipoCliente(raw) {
  if (!raw) return 'esporadico';
  const s = norm(raw);
  if (s.includes('booksy'))                                   return 'agendado';
  if (s.includes('primeiro') || s.includes('primeira'))       return 'primeira_vez';
  return 'esporadico';
}

function normUnidade(profissional) {
  if (!profissional) return 'mutinga';
  return norm(profissional).includes('thieco') ? 'tambore' : 'mutinga';
}

function eAbaMensal(nome) {
  if (ABAS_IGNORAR.test(nome)) return false;
  const n = norm(nome);
  return MESES_NORM.some(m => n.includes(m));
}

// ─── Processamento de aba ────────────────────────────────────────────────────

function processarAba(sheet) {
  // raw: false → tudo como string formatada (datas como "2/4/2024", moeda como "R$ 39,04")
  const linhas = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw:    false,
    defval: '',
  });

  // Índices padrão (fallback se cabeçalho não for encontrado)
  let colData = 0, colAgend = 2, colServico = 3;
  let colFunc = 4, colValorSem = 7, colValorCom = 8, colPgto = 9, colObs = 10;
  let linhaInicio = 2; // pula linha 1 (título do mês) e linha 2 (cabeçalho)

  // Detectar linha de cabeçalho
  for (let i = 0; i < Math.min(linhas.length, 6); i++) {
    const row = linhas[i].map(c => norm(c));
    if (row.some(c => c.includes('funcionario'))) {
      // Usar PRIMEIRA ocorrência de cada coluna (evita duplicatas da seção de comissão)
      let dataSet=false, agendSet=false, servicoSet=false, funcSet=false;
      let valSemSet=false, valComSet=false, pgtoSet=false, obsSet=false;

      row.forEach((c, idx) => {
        if (c === 'data'                                     && !dataSet)    { colData    = idx; dataSet    = true; }
        if (c.includes('agendamento')                        && !agendSet)   { colAgend   = idx; agendSet   = true; }
        if (c.includes('servic') && c.includes('produto')   && !servicoSet) { colServico = idx; servicoSet = true; }
        if (c.includes('funcionario')                        && !funcSet)    { colFunc    = idx; funcSet    = true; }
        if (c.includes('total') && c.includes('s/') &&
            !c.includes('c/')                                && !valSemSet)  { colValorSem = idx; valSemSet = true; }
        if (c.includes('total') && c.includes('c/')          && !valComSet)  { colValorCom = idx; valComSet = true; }
        if ((c.includes('forma') || c.includes('pgto'))      && !pgtoSet)    { colPgto    = idx; pgtoSet    = true; }
        if (c.includes('observa')                            && !obsSet)     { colObs     = idx; obsSet     = true; }
      });
      linhaInicio = i + 1;
      break;
    }
  }

  const vendas = [];

  for (let i = linhaInicio; i < linhas.length; i++) {
    const row = linhas[i];

    const rawData = row[colData];
    if (!rawData || String(rawData).trim() === '') continue;

    const data = parseData(rawData);
    if (!data) continue;

    const servicoRaw = String(row[colServico] ?? '').trim();
    if (!servicoRaw) continue;

    // Ignorar linhas de total/resumo
    if (/^(total|subtotal|soma|faturamento|#ref)/i.test(servicoRaw)) continue;

    const profissional = String(row[colFunc] ?? '').trim();
    if (!profissional || /^(total|nome|funcionario)/i.test(profissional)) continue;

    const unidade    = normUnidade(profissional);
    const valorSem   = parseValor(row[colValorSem]);
    const valorCom   = parseValor(row[colValorCom]);

    // Valor final: preferir "com desconto", fallback "sem desconto"
    const valor = (valorCom !== null && valorCom > 0)
      ? valorCom
      : (valorSem !== null && valorSem > 0 ? valorSem : null);

    if (!valor || valor <= 0) continue;

    // Desconto
    const desconto = (valorSem && valorCom && valorSem > valorCom)
      ? parseFloat((valorSem - valorCom).toFixed(2))
      : 0;

    vendas.push({
      data,
      unidade,
      profissional,
      servico:         servicoRaw,
      valor,
      ...(desconto > 0.01 ? { desconto } : {}),
      forma_pagamento: normPagamento(row[colPgto]),
      tipo_cliente:    normTipoCliente(row[colAgend]),
      ...(row[colObs] && String(row[colObs]).trim()
        ? { observacao: String(row[colObs]).trim() }
        : {}),
    });
  }

  return vendas;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function converterArquivo(ano) {
  const arquivo = ARQUIVOS[ano];
  if (!fs.existsSync(arquivo)) {
    console.log(`  ⚠  Arquivo não encontrado: ${path.basename(arquivo)}`);
    return null;
  }

  console.log(`\n📂 Lendo ${path.basename(arquivo)}...`);
  const wb = XLSX.readFile(arquivo, { cellDates: false });

  const abasMensais = wb.SheetNames.filter(eAbaMensal);
  console.log(`   Abas mensais: ${abasMensais.join(', ')}`);

  const todasVendas = [];

  for (const nome of abasMensais) {
    const vendas = processarAba(wb.Sheets[nome]);
    const t = vendas.filter(v => v.unidade === 'tambore').length;
    const m = vendas.filter(v => v.unidade === 'mutinga').length;
    console.log(`   ${nome.padEnd(18)} → ${String(vendas.length).padStart(4)} registros  (Tamboré: ${t} | Mutinga: ${m})`);
    todasVendas.push(...vendas);
  }

  const saida = path.join(__dirname, `import-${ano}.json`);
  fs.writeFileSync(saida, JSON.stringify({ vendas: todasVendas, gastos: [] }, null, 2), 'utf8');

  const total_t = todasVendas.filter(v => v.unidade === 'tambore').length;
  const total_m = todasVendas.filter(v => v.unidade === 'mutinga').length;
  console.log(`\n   ✅ Total: ${todasVendas.length} vendas  (Tamboré: ${total_t} | Mutinga: ${total_m})`);
  console.log(`   💾 Salvo em: import-${ano}.json`);
  return { vendas: todasVendas, gastos: [] };
}

// ─── Execução ────────────────────────────────────────────────────────────────

const anos = process.argv[2] ? [parseInt(process.argv[2])] : [2024, 2025, 2026];

let totalGeral = 0;
for (const ano of anos) {
  const res = converterArquivo(ano);
  if (res) totalGeral += res.vendas.length;
}

console.log(`\n${'─'.repeat(55)}`);
console.log(`📊 Total geral convertido: ${totalGeral} registros`);
console.log(`\nPróximo passo: com o backend rodando, execute:`);
console.log(`  node importar.js 2024`);
console.log(`  node importar.js 2025`);
console.log(`  node importar.js 2026`);
