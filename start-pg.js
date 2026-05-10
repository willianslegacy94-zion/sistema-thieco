/**
 * Inicializa e sobe o PostgreSQL embutido do embedded-postgres.
 * Uso: node start-pg.js
 */
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

const BIN_DIR  = path.join(__dirname, 'backend', 'node_modules', '@embedded-postgres', 'windows-x64', 'native', 'bin');
const DATA_DIR = path.join(os.homedir(), '.thieco-pgdata');
const LOG_FILE = path.join(os.homedir(), '.thieco-pg.log');
const PG_PORT  = 5432;
const PG_USER  = 'postgres';
const PG_PASS  = 'Thieco2025!';
const PG_DB    = 'sistema_thieco';

const initdb  = path.join(BIN_DIR, 'initdb.exe');
const pg_ctl  = path.join(BIN_DIR, 'pg_ctl.exe');

function run(cmd, opts = {}) {
  console.log('  >', cmd.split(BIN_DIR).join('<bin>'));
  return execSync(cmd, { stdio: 'pipe', ...opts }).toString().trim();
}

// ─── 1. Verificar / inicializar data dir ────────────────────────────────────
if (!fs.existsSync(DATA_DIR)) {
  console.log('\n[1/4] Inicializando cluster PostgreSQL...');
  const pwFile = path.join(os.tmpdir(), 'pg_pwfile.txt');
  fs.writeFileSync(pwFile, PG_PASS);
  run(`"${initdb}" -D "${DATA_DIR}" -U ${PG_USER} --pwfile="${pwFile}" --encoding=UTF8 -A md5`);
  fs.unlinkSync(pwFile);

  // Ajustar porta no postgresql.conf
  const conf = path.join(DATA_DIR, 'postgresql.conf');
  let content = fs.readFileSync(conf, 'utf8');
  content = content.replace(/#port\s*=\s*5432/, `port = ${PG_PORT}`);
  content += `\nport = ${PG_PORT}\nlisten_addresses = 'localhost'\n`;
  fs.writeFileSync(conf, content);

  console.log('  Cluster inicializado em:', DATA_DIR);
} else {
  console.log('\n[1/4] Cluster já existe em:', DATA_DIR);
}

// ─── 2. Iniciar servidor ─────────────────────────────────────────────────────
console.log('\n[2/4] Iniciando servidor PostgreSQL...');
try {
  run(`"${pg_ctl}" start -D "${DATA_DIR}" -l "${LOG_FILE}" -w -t 30`);
  console.log('  Servidor iniciado na porta', PG_PORT);
} catch (e) {
  // Pode já estar rodando
  console.log('  (já estava rodando ou erro ignorado)');
}

// ─── 3. Criar banco de dados ─────────────────────────────────────────────────
console.log('\n[3/4] Criando banco de dados...');
const { Client } = require('./backend/node_modules/pg');

async function createDb() {
  // Conectar ao banco padrão 'postgres'
  const client = new Client({
    host: 'localhost',
    port: PG_PORT,
    user: PG_USER,
    password: PG_PASS,
    database: 'postgres',
  });

  try {
    await client.connect();
    const { rows } = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [PG_DB]
    );
    if (rows.length === 0) {
      await client.query(`CREATE DATABASE ${PG_DB}`);
      console.log(`  Banco "${PG_DB}" criado.`);
    } else {
      console.log(`  Banco "${PG_DB}" já existe.`);
    }
  } finally {
    await client.end();
  }
}

createDb().then(() => {
  console.log('\n[4/4] PostgreSQL pronto!');
  console.log('  Host: localhost');
  console.log('  Porta:', PG_PORT);
  console.log('  Banco:', PG_DB);
  console.log('  Usuário:', PG_USER);
  console.log('\n  Pode iniciar o backend agora: cd backend && npm run dev');
  process.exit(0);
}).catch(err => {
  console.error('\nErro ao criar banco:', err.message);
  console.error('Log do PG:', fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8').slice(-800) : '(vazio)');
  process.exit(1);
});
