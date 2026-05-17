import { useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, Scissors, Star, Hash, Users, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import FilterBar from './FilterBar';
import MetricCard from './MetricCard';
import RankingBarbeiros from './RankingBarbeiros';
import ImportButton from './ImportButton';

function toNum(v) { return parseFloat(v ?? 0); }

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  }).format(v ?? 0);
}

function fmtQtd(v) {
  return new Intl.NumberFormat('pt-BR').format(Math.round(v ?? 0));
}

// ─── Card clicável de Comissões Pagas ────────────────────────────────────────

function ComissoesPagasCard({ total, receitaBruta, loading, aberto, onToggle, titulo = 'Comissões Pagas' }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
      className={`card-premium border cursor-pointer select-none transition-colors duration-200 p-5 animate-slide-up
        ${aberto ? 'border-amber-600/70' : 'border-amber-800/50 hover:border-amber-600/50'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs uppercase tracking-widest text-gold-muted font-semibold">
          {titulo}
        </span>
        <div className="flex items-center gap-1.5">
          <Wallet size={18} strokeWidth={1.5} className="text-amber-400 opacity-70" />
          <ChevronDown
            size={14}
            strokeWidth={2}
            className={`text-amber-400/50 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {loading ? (
        <div className="h-8 w-32 bg-surface-hover rounded animate-pulse" />
      ) : (
        <p className="font-serif font-bold text-2xl sm:text-3xl leading-none text-amber-300">
          {fmt(total)}
        </p>
      )}

      {!loading && (
        <p className="mt-2 text-xs text-gold-light/50">
          {receitaBruta > 0 ? `${((total / receitaBruta) * 100).toFixed(1)}% do faturamento` : '—'}
        </p>
      )}

      <div className="mt-4 h-px bg-gradient-to-r from-transparent via-gold-dark/30 to-transparent" />
    </div>
  );
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
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

function DashboardAdmin({ dados, loading, erro, filtros, setFiltros, recarregar, profissionais }) {
  const fluxo  = dados?.fluxo?.totais ?? {};
  const [comissoesAberto, setComissoesAberto] = useState(false);

  // Quando a unidade muda, limpa o barbeiro selecionado e filtra a lista
  function handleFiltros(novosFiltros) {
    if (novosFiltros.unidade !== filtros.unidade) {
      setFiltros({ ...novosFiltros, profissional_id: '' });
      setComissoesAberto(false);
    } else {
      if (novosFiltros.profissional_id !== filtros.profissional_id) {
        // Abre automaticamente ao selecionar barbeiro; fecha ao limpar
        setComissoesAberto(!!novosFiltros.profissional_id);
      }
      setFiltros(novosFiltros);
    }
  }

  const profissionaisFiltrados = filtros.unidade
    ? profissionais.filter((p) => p.unidade === filtros.unidade)
    : profissionais;

  const barb   = filtros.profissional_id
    ? profissionais.find((p) => String(p.id) === String(filtros.profissional_id)) ?? null
    : null;

  const receitaBruta        = toNum(fluxo.receita_bruta);
  const totalComissoes      = toNum(fluxo.total_comissoes);
  const comissaoServico     = toNum(fluxo.total_comissao_servico);
  const comissaoProduto     = toNum(fluxo.total_comissao_produto);
  const totalGastos         = toNum(fluxo.total_gastos);
  const taxaPagBank         = toNum(fluxo.taxa_pagbank);
  const lucroLiquido        = toNum(fluxo.saldo_periodo);
  const totalDescontos      = toNum(fluxo.total_descontos);
  const pctDesconto         = toNum(fluxo.pct_desconto);
  const atendimentos        = toNum(fluxo.atendimentos);
  const ticketMedio         = toNum(fluxo.ticket_medio);
  const qtdServicos         = parseInt(fluxo.qtd_servicos ?? 0);
  const qtdProdutos         = parseInt(fluxo.qtd_produtos ?? 0);
  const margem              = receitaBruta > 0
    ? ((lucroLiquido / receitaBruta) * 100).toFixed(1)
    : '0.0';

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 animate-fade-in">
      <FilterBar
        filtros={filtros}
        onChange={handleFiltros}
        onRecarregar={recarregar}
        loading={loading}
        profissionais={profissionaisFiltrados}
      />

      {/* Badge de barbeiro selecionado */}
      {barb && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-gold/10 border border-gold-dark/40 w-fit">
          <Users size={13} className="text-gold shrink-0" />
          <span className="text-xs text-gold font-medium uppercase tracking-wider">
            Visão de barbeiro:
          </span>
          <span className="text-xs text-gold-light font-bold">{barb.nome}</span>
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span><strong>Erro:</strong> {erro} — verifique se o servidor está rodando.</span>
        </div>
      )}

      {/* ── Cards: visão de barbeiro específico ───────────────────────────── */}
      {barb ? (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <MetricCard titulo="Faturamento Gerado"  valor={receitaBruta}    icon={TrendingUp} variante="default" loading={loading} sub={`${filtros.inicio} → ${filtros.fim}`} />
            <ComissoesPagasCard
              titulo="Comissão Total"
              total={totalComissoes}
              receitaBruta={receitaBruta}
              loading={loading}
              aberto={comissoesAberto}
              onToggle={() => setComissoesAberto((v) => !v)}
            />
            <MetricCard titulo="Atendimentos"          valor={atendimentos}    icon={Star}       variante="sucesso" loading={loading} formatado={false} sub="Comandas no período" />
            <MetricCard titulo="Ticket Médio"         valor={ticketMedio}     icon={Hash}       variante="default" loading={loading} sub="Faturamento ÷ Atendimentos" />
          </section>

          {/* Painel de detalhamento de comissões */}
          {comissoesAberto && !loading && (
            <section className="mb-4 rounded-xl border border-amber-800/40 bg-amber-950/20 p-5 animate-slide-up">
              <p className="text-[11px] text-amber-400/60 uppercase tracking-widest font-semibold mb-4">
                Detalhamento — Comissões
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="card-premium p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-gold-muted uppercase tracking-wider">Serviços</p>
                    <p className="text-lg font-bold text-amber-400 mt-0.5">{fmt(comissaoServico)}</p>
                    <p className="text-[10px] text-gold-muted/60 mt-0.5">
                      {fmtQtd(qtdServicos)} execuções · 40% s/ bruto
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gold-muted uppercase tracking-wider">% do total</p>
                    <p className="text-2xl font-bold text-amber-400">
                      {totalComissoes > 0 ? ((comissaoServico / totalComissoes) * 100).toFixed(1) : '0,0'}%
                    </p>
                  </div>
                </div>
                <div className="card-premium p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-gold-muted uppercase tracking-wider">Produtos Físicos</p>
                    <p className="text-lg font-bold text-amber-400 mt-0.5">{fmt(comissaoProduto)}</p>
                    <p className="text-[10px] text-gold-muted/60 mt-0.5">
                      {fmtQtd(qtdProdutos)} unidades vendidas · 10% s/ bruto
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gold-muted uppercase tracking-wider">% do total</p>
                    <p className="text-2xl font-bold text-amber-400">
                      {totalComissoes > 0 ? ((comissaoProduto / totalComissoes) * 100).toFixed(1) : '0,0'}%
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Ranking filtrado */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <RankingBarbeiros comissoes={dados?.comissoes} loading={loading} />
            <ImportButton onSucesso={recarregar} />
          </section>
        </>
      ) : (
        <>
          {/* ── Cards: visão consolidada (sem filtro de barbeiro) ──────────── */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <MetricCard titulo="Faturamento Bruto"     valor={receitaBruta}   icon={TrendingUp}  variante="default" loading={loading} sub={`${filtros.inicio} → ${filtros.fim}`} />
            <MetricCard titulo="Comissões Pagas"        valor={totalComissoes} icon={Wallet}       variante="alerta"  loading={loading} sub={receitaBruta > 0 ? `${((totalComissoes/receitaBruta)*100).toFixed(1)}% do faturamento` : '—'} />
            <MetricCard titulo="Gastos Operacionais"    valor={totalGastos}    icon={TrendingDown} variante="perigo"  loading={loading} sub={receitaBruta > 0 ? `${((totalGastos/receitaBruta)*100).toFixed(1)}% do faturamento` : '—'} />
            <MetricCard titulo="Lucro Líquido"          valor={lucroLiquido}   icon={lucroLiquido >= 0 ? TrendingUp : TrendingDown} variante={lucroLiquido >= 0 ? 'sucesso' : 'perigo'} loading={loading} sub={`Margem: ${margem}%`} />
          </section>

          {/* Cards descontos + taxa PagBank */}
          {(totalDescontos > 0 || taxaPagBank > 0 || !loading) && (
            <section className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(totalDescontos > 0 || !loading) && (
                <div className="card-premium p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-gold-muted uppercase tracking-wider">Descontos concedidos</p>
                    <p className="text-lg font-bold text-amber-400 mt-0.5">{fmt(totalDescontos)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gold-muted uppercase tracking-wider">% receita bruta</p>
                    <p className="text-2xl font-bold text-amber-400">{pctDesconto.toFixed(1)}%</p>
                  </div>
                </div>
              )}
              {(taxaPagBank > 0 || !loading) && (
                <div className="card-premium p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-gold-muted uppercase tracking-wider">Taxa PagBank (maquinha)</p>
                    <p className="text-lg font-bold text-orange-400 mt-0.5">{fmt(taxaPagBank)}</p>
                    <p className="text-[10px] text-gold-muted/60 mt-0.5">Déb 1,19% · Créd 3,49% · Pix 0%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gold-muted uppercase tracking-wider">% receita bruta</p>
                    <p className="text-2xl font-bold text-orange-400">
                      {receitaBruta > 0 ? ((taxaPagBank / receitaBruta) * 100).toFixed(1) : '0,0'}%
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

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
                      { label: '(+) Receita Bruta',              valor: receitaBruta,                            classe: 'text-gold font-semibold' },
                      { label: '(-) Comissões dos Barbeiros',     valor: -totalComissoes,                         classe: 'text-amber-400' },
                      { label: '(-) Taxa PagBank (maquinha)',      valor: -taxaPagBank,                            classe: 'text-orange-400' },
                      { label: '(=) Receita Líquida',             valor: receitaBruta-totalComissoes-taxaPagBank, classe: 'text-gold-light border-t border-surface-border' },
                      { label: '(-) Gastos Operacionais',         valor: -totalGastos,                            classe: 'text-red-400' },
                      { label: '(=) Resultado Operacional',       valor: lucroLiquido,                            classe: `font-bold font-serif text-base border-t-2 border-gold/30 pt-2 ${lucroLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}` },
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
        </>
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
