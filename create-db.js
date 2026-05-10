const { Client } = require('./backend/node_modules/pg');
const c = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'Thieco2025!', database: 'postgres' });
c.connect()
  .then(() => c.query("SELECT 1 FROM pg_database WHERE datname = 'sistema_thieco'"))
  .then((r) => {
    if (r.rows.length) { console.log('Banco já existe.'); return; }
    return c.query('CREATE DATABASE sistema_thieco').then(() => console.log('Banco "sistema_thieco" criado.'));
  })
  .then(() => c.end())
  .catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
