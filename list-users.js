const { Client } = require('./backend/node_modules/pg');
const c = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'Thieco2025!', database: 'sistema_thieco' });
c.connect()
  .then(() => c.query('SELECT id, nome, username, role, unidade_acesso, ativo FROM usuarios ORDER BY id'))
  .then((r) => { console.table(r.rows); return c.end(); })
  .catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
