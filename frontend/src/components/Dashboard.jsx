import { TrendingUp, TrendingDown, Wallet, AlertCircle, Scissors, Star, Hash } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import FilterBar from './FilterBar';
import MetricCard from './MetricCard';
import GraficoProjecao from './GraficoProjecao';
import RankingBarbeiros from './RankingBarbeiros';
import ImportButton from './ImportButton';

function toNum(v) { return parseFloat(v ?? 0); }

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  }).format(v ?? 0);
}

// ─── View do Barbeiro (dados pessoais) ───────────────────────────────────────

function DashboardBarbeiro({ dados, loading, erro, filtros, setFiltros, recarregar }) {
  const { user } = useAuth();
  const my = dados?.myData;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 animate-fade-in">
      {/* Saudação pessoal */}
      <div className="py-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold-dark/40 flex items-center justify-center">
          <Scissors size={16} className="text-gold" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="font-serif font-bold text-lg text-gold leading-none">
            Olá, {user?.nome?.split(' ')[0]}
          </h2>
          <p className="text-xs text-gold-muted mt-0.5 uppercase tracking-wider">
            Meu Painel — {filtros.inicio} → {filtros.fim}
          </p>
        </div>
      </div>

      <FilterBar filtros={filtros} onChange={setFiltros} onRecarregar={recarregar} loading={loading} />

      {erro && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Métricas pessoais */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          titulo="Meu Faturamento"
          valor={toNum(my?.faturamento_bruto)}
          icon={TrendingUp}
          variante="default"
          loading={loading}
          sub={`Posição no ranking: ${my?.posicao ?? '—'}º`}
        />
        <MetricCard
          titulo="Minhas Comissões"
          valor={toNum(my?.comissao_total)}
          icon={Wallet}
          variante="alerta"
          loading={loading}
          sub={my ? `${toNum(my.percentual_comissao)}% sobre faturamento` : '—'}
        />
        <MetricCard
          titulo="Atendimentos"
          valor={toNum(my?.qtd_atendimentos)}
          icon={Star}
          variante="sucesso"
          loading={loading}
          sub="Total no período"
        />
        <MetricCard
          titulo="Ticket Médio"
          valor={toNum(my?.ticket_medio)}
          icon={Hash}
          variante="default"
          loading={loading}
          sub="Valor médio por serviço"
        />
      </section>

      {/* Ranking (com mascaramento para outros) */}
      <section>
        <RankingBarbeiros comissoes={dados?.comissoes} loading={loading} />
      </section>
    </main>
  );
}

// ─── View do Admin (completa) ────────────────────────────────────────────────

function DashboardAdmin({ dados, loading, erro, filtros, setFiltros, recarregar }) {
  const fluxo  = dados?.fluxo?.totais ?? {};
  const projecao = dados?.projecao ?? [];

  const receitaBruta   = toNum(fluxo.receita_bruta);
  const totalComissoes = toNum(fluxo.total_comissoes);
  const totalGastos    = toNum(fluxo.total_gastos);
  const lucroLiquido   = toNum(fluxo.saldo_periodo);
  const totalDescontos = toNum(fluxo.total_descontos);
  const pctDesconto    = toNum(fluxo.pct_desconto);
  const margem         = receitaBruta > 0
    ? ((lucroLiquido / receitaBruta) * 100).toFixed(1)
    : '0.0';

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 animate-fade-in">
      <FilterBar filtros={filtros} onChange={setFiltros} onRecarregar={recarregar} loading={loading} />

      {erro && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span><strong>Erro:</strong> {erro} — verifique se o servidor está rodando.</span>
        </div>
      )}

      {/* Cards de métricas */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <MetricCard titulo="Faturamento Bruto"     valor={receitaBruta}   icon={TrendingUp}  variante="default" loading={loading} sub={`${filtros.inicio} → ${filtros.fim}`} />
        <MetricCard titulo="Comissões Pagas"        valor={totalComissoes} icon={Wallet}       variante="alerta"  loading={loading} sub={receitaBruta > 0 ? `${((totalComissoes/receitaBruta)*100).toFixed(1)}% do faturamento` : '—'} />
        <MetricCard titulo="Gastos Operacionais"    valor={totalGastos}    icon={TrendingDown} variante="perigo"  loading={loading} sub={receitaBruta > 0 ? `${((totalGastos/receitaBruta)*100).toFixed(1)}% do faturamento` : '—'} />
        <MetricCard titulo="Lucro Líquido"          valor={lucroLiquido}   icon={lucroLiquido >= 0 ? TrendingUp : TrendingDown} variante={lucroLiquido >= 0 ? 'sucesso' : 'perigo'} loading={loading} sub={`Margem: ${margem}%`} />
      </section>

      {/* Card de descontos */}
      {(totalDescontos > 0 || !loading) && (
        <section className="mb-6">
          <div className="card-premium p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gold-muted uppercase tracking-wider">Descontos concedidos</p>
              <p className="text-lg font-bold text-amber-400 mt-0.5">{fmt(totalDescontos)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gold-muted uppercase tracking-wider">% sobre receita bruta</p>
              <p className="text-2xl font-bold text-amber-400">{pctDesconto.toFixed(1)}%</p>
            </div>
          </div>
        </section>
      )}

      {/* Gráfico */}
      <section className="mb-6">
        <GraficoProjecao dados={projecao} loading={loading} />
      </section>

      {/* Ranking + Importação */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <RankingBarbeiros comissoes={dados?.comissoes} loading={loading} />
        <ImportButton onSucesso={recarregar} />
      </section>

      {/* DRE resumido */}
      {!loading && dados?.dre && (
        <section className="card-premium p-5 animate-slide-up">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-muted mb-1">
            DRE Bruto — Período
          </h2>
          <div className="h-px bg-gradient-to-r from-transparent via-gold-dark/30 to-transparent mb-5" />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: '(+) Receita Bruta',          valor: receitaBruta,                classe: 'text-gold font-semibold' },
                  { label: '(-) Comissões dos Barbeiros', valor: -totalComissoes,             classe: 'text-amber-400' },
                  { label: '(=) Receita Líquida',         valor: receitaBruta-totalComissoes, classe: 'text-gold-light border-t border-surface-border' },
                  { label: '(-) Gastos Operacionais',     valor: -totalGastos,                classe: 'text-red-400' },
                  { label: '(=) Resultado Operacional',   valor: lucroLiquido,                classe: `font-bold font-serif text-base border-t-2 border-gold/30 pt-2 ${lucroLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}` },
                ].map((row) => (
                  <tr key={row.label} className="table-row-dark">
                    <td className={`py-3 px-2 text-gold-light/70 ${row.classe}`}>{row.label}</td>
                    <td className={`py-3 px-2 text-right tabular-nums ${row.classe}`}>{fmt(row.valor)}</td>
                    <td className="py-3 px-2 text-right text-xs text-gold-muted">
                      {receitaBruta > 0 && row.valor !== receitaBruta
                        ? `${Math.abs((row.valor / receitaBruta) * 100).toFixed(1)}%`
                        : '100%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-surface-hover border border-surface-border">
            <span className="text-xs text-gold-muted uppercase tracking-wider">Margem Bruta</span>
            <span className={`font-serif font-bold text-lg ${parseFloat(margem) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {margem}%
            </span>
          </div>
        </section>
      )}
    </main>
  );
}

// ─── Componente raiz — roteia por role ───────────────────────────────────────

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const state = useDashboard();

  if (isAdmin) return <DashboardAdmin {...state} />;
  return <DashboardBarbeiro {...state} />;
}
