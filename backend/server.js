require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { runMigrations } = require('./models');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middlewares ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Rotas ───────────────────────────────────────────────────────────────────
app.use('/auth',          require('./routes/auth'));
app.use('/profissionais', require('./routes/profissionais'));
app.use('/vendas',        require('./routes/vendas'));
app.use('/gastos',        require('./routes/gastos'));
app.use('/import',        require('./routes/import'));
app.use('/relatorios',    require('./routes/relatorios'));
app.use('/gestao',        require('./routes/gestao'));
app.use('/combos',        require('./routes/combos'));
app.use('/clientes',      require('./routes/clientes'));
app.use('/metas',         require('./routes/metas'));
app.use('/metas-unidade', require('./routes/metas-unidade'));
app.use('/catalogo',     require('./routes/catalogo'));

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.path}` });
});

// ─── Error handler ───────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

// ─── Boot ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log('   Endpoints disponíveis:');
      console.log('   GET  /health');
      console.log('   GET  /profissionais');
      console.log('   GET  /vendas?inicio=YYYY-MM-DD&fim=YYYY-MM-DD&unidade=tambore');
      console.log('   POST /vendas');
      console.log('   GET  /gastos?inicio=YYYY-MM-DD&fim=YYYY-MM-DD');
      console.log('   POST /gastos');
      console.log('   POST /import');
      console.log('   GET  /relatorios/fluxo-caixa?inicio=YYYY-MM-DD&fim=YYYY-MM-DD');
      console.log('   GET  /relatorios/dre?inicio=YYYY-MM-DD&fim=YYYY-MM-DD');
      console.log('   GET  /relatorios/comissoes?inicio=YYYY-MM-DD&fim=YYYY-MM-DD\n');
    });
  } catch (err) {
    console.error('Falha ao iniciar o servidor:', err.message);
    process.exit(1);
  }
}

start();
