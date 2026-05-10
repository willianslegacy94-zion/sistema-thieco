import { useState, useEffect } from 'react';
import { BarChart2, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

function mesAtual() {
  const hoje = new Date();
  return {
    inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10),
    fim:    new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

export default function RelatorioOperador() {
  const { user } = useAuth();
  const [filtros, setFiltros] = useState(mesAtual());
  const [dados,   setDados]   = useState(null);
  const [loading, setLoading] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const res = await api.resumoOperador(filtros);
      setDados(res);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  return (
    <main className="max-w-2xl mx-auto px-4 pb-12 pt-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 mb-3">
          <BarChart2 size={22} className="text-blue-400" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif font-bold text-xl text-gold">Relatório</h1>
        <p className="text-[11px] text-gold-muted uppercase tracking-widest mt-1">
          Unidade {user?.unidade ?? 'Mutinga'}
        </p>
      </div>

      {/* Filtro de período */}
      <div className="card-premium p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            type="date" value={filtros.inicio}
            onChange={(e) => setFiltros((f) => ({ ...f, inicio: e.target.value }))}
            className="input-dark text-xs px-2 py-1"
          />
          <span className="text-gold-muted text-xs">até</span>
          <input
            type="date" value={filtros.fim}
            onChange={(e) => setFiltros((f) => ({ ...f, fim: e.target.value }))}
            className="input-dark text-xs px-2 py-1"
          />
        </div>
        <button
          onClick={carregar} disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gold-muted hover:text-gold border border-surface-border rounded-lg transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <span className="w-6 h-6 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
        </div>
      )}

      {dados && !loading && (
        <div className="space-y-6">
          {/* Cards hoje / mês */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card-premium p-5 text-center">
              <p className="text-[11px] text-gold-muted uppercase tracking-wider mb-2">Vendas hoje</p>
              <p className="text-2xl font-bold text-gold">{fmt(dados.hoje.total)}</p>
              <p className="text-xs text-gold-muted mt-1">{dados.hoje.qtd} atendimento(s)</p>
            </div>
            <div className="card-premium p-5 text-center">
              <p className="text-[11px] text-gold-muted uppercase tracking-wider mb-2">Total do período</p>
              <p className="text-2xl font-bold text-gold">{fmt(dados.mes.total)}</p>
              <p className="text-xs text-gold-muted mt-1">{dados.mes.qtd} atendimento(s)</p>
            </div>
          </div>

          {/* Serviços mais populares */}
          <div className="card-premium p-5">
            <h2 className="text-sm font-semibold text-gold-light mb-4">Serviços mais realizados</h2>
            <div className="space-y-2">
              {dados.servicos_populares.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gold-muted w-5">{i + 1}.</span>
                    <span className="text-sm text-gold-light">{s.servico}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gold-muted">{s.qtd}x</span>
                    <span className="text-gold font-medium">{fmt(s.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vendas por dia */}
          {dados.vendas_por_dia.length > 0 && (
            <div className="card-premium p-5">
              <h2 className="text-sm font-semibold text-gold-light mb-4">Vendas por dia</h2>
              <div className="space-y-1.5">
                {dados.vendas_por_dia.map((d) => (
                  <div key={d.data} className="flex justify-between text-xs">
                    <span className="text-gold-muted">{d.data}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gold-muted">{d.qtd} atend.</span>
                      <span className="text-gold font-medium">{fmt(d.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
