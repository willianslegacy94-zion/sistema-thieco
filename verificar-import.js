require('./backend/node_modules/dotenv').config({ path: './backend/.env' });
const { Pool } = require('./backend/node_modules/pg');
const pool = new Pool({
  host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
});
(async () => {
  // Ranking por barbeiro (vendas importadas)
  const r = await pool.query(`
    SELECT
      COALESCE(p.nome, '(sem vínculo)') AS barbeiro,
      COUNT(*)                          AS atendimentos,
      SUM(v.valor)::NUMERIC(10,2)       AS faturamento
    FROM vendas v
    LEFT JOIN profissionais p ON p.id = v.profissional_id
    WHERE v.importado = true
    GROUP BY p.nome
    ORDER BY faturamento DESC
  `);
  console.log('\nRanking por barbeiro (dados históricos importados):');
  console.log('─'.repeat(55));
  r.rows.forEach(row =>
    console.log(
      `  ${row.barbeiro.padEnd(22)} | ${String(row.atendimentos).padStart(5)} atend. | R$ ${parseFloat(row.faturamento).toFixed(2).padStart(10)}`
    )
  );

  const total = r.rows.reduce((s, row) => s + parseInt(row.atendimentos), 0);
  const semVinculo = r.rows.find(row => row.barbeiro === '(sem vínculo)');
  console.log('─'.repeat(55));
  console.log(`  TOTAL: ${total} atendimentos`);
  if (semVinculo) {
    const pct = ((semVinculo.atendimentos / total) * 100).toFixed(1);
    console.log(`  ⚠  Sem vínculo: ${semVinculo.atendimentos} registros (${pct}%)`);
  }
  await pool.end();
})();
