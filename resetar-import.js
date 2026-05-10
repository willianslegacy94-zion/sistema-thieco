/**
 * resetar-import.js
 *
 * 1. Remove todas as vendas importadas (importado = true)
 * 2. Insere barbeiros históricos (Marcos, Tabita, Iuri) como inativos,
 *    se ainda não existirem
 *
 * Uso: node resetar-import.js
 */

require('./backend/node_modules/dotenv').config({ path: './backend/.env' });
const { Pool } = require('./backend/node_modules/pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'sistema_thieco',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

const HISTORICOS = [
  { nome: 'Marcos',  unidade: 'mutinga', percentual_comissao: 40 },
  { nome: 'Tabita',  unidade: 'mutinga', percentual_comissao: 40 },
  { nome: 'Iuri',    unidade: 'mutinga', percentual_comissao: 40 },
];

(async () => {
  const client = await pool.connect();
  try {
    // 1. Deletar todas as vendas importadas
    const del = await client.query(`DELETE FROM vendas WHERE importado = true`);
    console.log(`🗑  Vendas importadas removidas: ${del.rowCount}`);

    // 2. Inserir barbeiros históricos (se não existirem)
    for (const b of HISTORICOS) {
      const exists = await client.query(
        `SELECT id FROM profissionais WHERE LOWER(nome) = LOWER($1) LIMIT 1`,
        [b.nome]
      );
      if (exists.rowCount === 0) {
        await client.query(
          `INSERT INTO profissionais (nome, unidade, percentual_comissao, ativo)
           VALUES ($1, $2, $3, false)`,
          [b.nome, b.unidade, b.percentual_comissao]
        );
        console.log(`✅ Profissional adicionado (inativo): ${b.nome}`);
      } else {
        console.log(`ℹ  Já existe: ${b.nome} (id ${exists.rows[0].id})`);
      }
    }

    // 3. Listar todos os profissionais para conferência
    const profs = await client.query(
      `SELECT id, nome, unidade, ativo FROM profissionais ORDER BY id`
    );
    console.log('\nProfissionais no banco:');
    profs.rows.forEach(p =>
      console.log(`  [${p.id}] ${p.nome.padEnd(20)} | ${p.unidade} | ${p.ativo ? 'ativo' : 'INATIVO'}`)
    );

    console.log('\n✅ Pronto. Execute agora:');
    console.log('  node importar.js 2024');
    console.log('  node importar.js 2025');
    console.log('  node importar.js 2026');
  } finally {
    client.release();
    await pool.end();
  }
})();
