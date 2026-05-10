require('./backend/node_modules/dotenv').config({ path: './backend/.env' });
const { Pool } = require('./backend/node_modules/pg');
const pool = new Pool({
  host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
});
(async () => {
  await pool.query(
    `INSERT INTO profissionais (nome, unidade, percentual_comissao, ativo)
     VALUES ($1,$2,$3,$4),($5,$6,$7,$8)`,
    ['Tabita', 'mutinga', 40, false, 'Iuri', 'mutinga', 40, false]
  );
  const r = await pool.query('SELECT id, nome, unidade, ativo FROM profissionais ORDER BY id');
  r.rows.forEach(p =>
    console.log(`[${p.id}] ${p.nome.padEnd(20)} | ${p.unidade} | ${p.ativo ? 'ativo' : 'INATIVO'}`)
  );
  await pool.end();
})();
