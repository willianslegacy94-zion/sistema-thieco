const { Client } = require('./backend/node_modules/pg');
const c = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'Thieco2025!', database: 'sistema_thieco' });
c.connect()
  .then(() => c.query("UPDATE profissionais SET ativo = false WHERE LOWER(nome) LIKE '%marcos%' RETURNING id, nome"))
  .then((r) => { console.log('Desativado:', r.rows); return c.end(); })
  .catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
