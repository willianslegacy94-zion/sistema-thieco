import { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

function mesAtual() {
  const hoje = new Date();
  return {
    inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10),
    fim:    new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

const UNIDADES = [
  { value: '',        label: 'Todas as unidades' },
  { value: 'tambore', label: 'Tamboré' },
  { value: 'mutinga', label: 'Mutinga' },
];

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

export default function Performance() {
  const [filtros, setFiltros] = useState(mesAtual());
  const [dados,   setDados]   = useState(null);
  const [metas,   setMetas]   = useState([]);
  const [loading, setLoading] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const periodo = filtros.inicio.slice(0, 7);
      const [resumo, metasRes] = await Promise.all([
        api.resumoOperador({ ...filtros, ...(filtros.unidade ? { unidade: filtros.unidade } : {}) }),
        api.statusMetas({ periodo, ...(filtros.unidade ? { unidade: filtros.unidade } : {}) }).catch(() => ({ status: [] })),
      ]);
      setDados(resumo);
      setMetas(metasRes.status ?? []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  const NIVEL_CORES = {
    ouro:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    prata:  'text-gray-300 bg-gray-400/10 border-gray-400/30',
    bronze: 'text-amber-600 bg-amber-700/10 border-amber-700/30',
    abaixo: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  return (
    <main className="max-w-3xl mx-auto px-4 pb-12 pt-6 animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-3">
          <TrendingUp size={22} className="text-emerald-400" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif font-bold text-xl text-gold">Performance da Barbearia</h1>
        <p className="text-[11px] text-gold-muted uppercase tracking-widest mt-1">Visão do negócio</p>
      </div>

      {/* Filtros */}
      <div className="card-premium p-4 mb-6 flex flex-wrap items-center gap-3">
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
        <select
          value={filtros.unidade ?? ''}
          onChange={(e) => setFiltros((f) => ({ ...f, unidade: e.target.value || undefined }))}
          className="input-dark text-xs px-2 py-1"
        >
          {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
        <button
          onClick={carregar} disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gold-muted hover:text-gold border border-surface-border rounded-lg transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <span className="w-6 h-6 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
        </div>
      )}

      {dados && !loading && (
        <div className="space-y-6">
          {/* Cards principais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card-premium p-5 text-center">
              <p className="text-[11px] text-gold-muted uppercase tracking-wider mb-2">Vendas hoje</p>
              <p className="text-3xl font-bold text-gold">{fmt(dados.hoje.total)}</p>
              <p className="text-xs text-gold-muted mt-1">{dados.hoje.qtd} atendimento(s)</p>
            </div>
            <div className="card-premium p-5 text-center">
              <p className="text-[11px] text-gold-muted uppercase tracking-wider mb-2">Total do período</p>
              <p className="text-3xl font-bold text-gold">{fmt(dados.mes.total)}</p>
              <p className="text-xs text-gold-muted mt-1">{dados.mes.qtd} atendimento(s)</p>
            </div>
          </div>

          {/* Serviços populares */}
          {dados.servicos_populares.length > 0 && (
            <div className="card-premium p-5">
              <h2 className="text-sm font-semibold text-gold-light mb-4">Serviços mais realizados</h2>
              <div className="space-y-3">
                {dados.servicos_populares.map((s, i) => {
                  const max = dados.servicos_populares[0].qtd;
                  const pct = Math.round((s.qtd / max) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gold-light">{s.servico}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-gold-muted">{s.qtd}x</span>
                          <span className="text-gold font-medium">{fmt(s.total)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                        <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status metas */}
          {metas.length > 0 && (
            <div className="card-premium p-5">
              <h2 className="text-sm font-semibold text-gold-light mb-4">Status de Metas</h2>
              <div className="space-y-3">
                {metas.filter((m) => m.nivel !== null).map((m) => (
                  <div key={m.profissional_id} className="flex items-center justify-between">
                    <p className="text-sm text-gold-light">{m.nome}</p>
                    <span className={`text-[11px] uppercase font-bold px-2 py-0.5 rounded border ${NIVEL_CORES[m.nivel] ?? ''}`}>
                      {m.nivel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendas por dia */}
          {dados.vendas_por_dia.length > 0 && (
            <div className="card-premium p-5">
              <h2 className="text-sm font-semibold text-gold-light mb-4">Evolução diária</h2>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {dados.vendas_por_dia.map((d) => {
                  const max = Math.max(...dados.vendas_por_dia.map((x) => parseFloat(x.total)));
                  const pct = max > 0 ? Math.round((parseFloat(d.total) / max) * 100) : 0;
                  return (
                    <div key={d.data} className="flex items-center gap-3">
                      <span className="text-[11px] text-gold-muted w-24 shrink-0">{d.data}</span>
                      <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                        <div className="h-full bg-gold/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-gold font-medium w-24 text-right shrink-0">{fmt(d.total)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
