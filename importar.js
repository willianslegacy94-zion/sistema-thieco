/**
 * importar.js
 *
 * Envia um arquivo import-XXXX.json para o endpoint POST /import do sistema.
 * O backend precisa estar rodando antes de executar este script.
 *
 * Uso:
 *   node importar.js 2024
 *   node importar.js 2025
 *   node importar.js 2026
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 3001;

const ano = process.argv[2];
if (!ano) {
  console.error('Uso: node importar.js <ano>  (ex: node importar.js 2024)');
  process.exit(1);
}

const arquivo = path.join(__dirname, `import-${ano}.json`);
if (!fs.existsSync(arquivo)) {
  console.error(`Arquivo não encontrado: ${arquivo}`);
  console.error('Execute primeiro: node converter-excel.js');
  process.exit(1);
}

const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
console.log(`\n📤 Importando ${arquivo}`);
console.log(`   Vendas a importar: ${dados.vendas.length}`);
console.log(`   Gastos a importar: ${dados.gastos.length}`);

// Importar em lotes para não estourar o limite de 10mb do body
const LOTE = 500;
const lotes = [];
for (let i = 0; i < dados.vendas.length; i += LOTE) {
  lotes.push(dados.vendas.slice(i, i + LOTE));
}

console.log(`   Enviando em ${lotes.length} lote(s) de até ${LOTE} registros...\n`);

async function enviarLote(vendas, idx) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      vendas,
      gastos: idx === 0 ? dados.gastos : [], // gastos só no primeiro lote
    });

    const options = {
      hostname: API_HOST,
      port:     API_PORT,
      path:     '/import',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 201) {
            resolve(json);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(json)}`));
          }
        } catch {
          reject(new Error(`Resposta inválida: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  let totalImportado = 0;

  for (let i = 0; i < lotes.length; i++) {
    const lote = lotes[i];
    process.stdout.write(`   Lote ${i + 1}/${lotes.length} (${lote.length} vendas)... `);
    try {
      const res = await enviarLote(lote, i);
      totalImportado += res.resumo?.vendas_importadas ?? 0;
      console.log(`✅ OK (${res.resumo?.vendas_importadas} importadas)`);
    } catch (err) {
      console.log(`❌ ERRO`);
      console.error(`   ${err.message}`);

      // Salva lote com problema para análise
      const errFile = `import-${ano}-lote${i + 1}-erro.json`;
      fs.writeFileSync(errFile, JSON.stringify({ vendas: lote, gastos: [] }, null, 2));
      console.error(`   Lote salvo em ${errFile} para análise.`);
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Importação concluída: ${totalImportado} vendas inseridas no banco.`);
})();
