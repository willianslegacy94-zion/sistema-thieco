import { useState } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import FilterBar from '../components/FilterBar';
import GraficoProjecao from '../components/GraficoProjecao';
import BreakEvenCard from '../components/BreakEvenCard';
import TicketMedioCard from '../components/TicketMedioCard';
import { useInteligencia } from '../hooks/useInteligencia';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

function DetalhamentoDiario({ entradas, saidas, loading }) {
  const [aberto, setAberto] = useState(false);

  if (loading) return null;

  const mapaEntradas = {};
  for (const e of (entradas ?? [])) {
    const chave = e.data?.slice(0, 10) ?? e.data;
    if (!mapaEntradas[chave]) mapaEntradas[chave] = { bruto: 0, comissao: 0, qtd: 0, unidades: [] };
    mapaEntradas[chave].bruto   += parseFloat(e.total_bruto ?? 0);
    mapaEntradas[chave].comissao += parseFloat(e.total_comissao ?? 0);
    mapaEntradas[chave].qtd     += parseInt(e.qtd_vendas ?? 0);
    mapaEntradas[chave].unidades.push(e.unidade);
  }

  const mapaSaidas = {};
  for (const s of (saidas ?? [])) {
    const chave = s.data?.slice(0, 10) ?? s.data;
    if (!mapaSaidas[chave]) mapaSaidas[chave] = { gastos: 0, qtd: 0 };
    mapaSaidas[chave].gastos += parseFloat(s.total_gastos ?? 0);
    mapaSaidas[chave].qtd   += parseInt(s.qtd_gastos ?? 0);
  }

  const dias = [...new Set([...Object.keys(mapaEntradas), ...Object.keys(mapaSaidas)])].sort().reverse();

  return (
    <section className="card-premium overflow-hidden">
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-hover/50 transition-colors"
      >
        <div>
          <h2 className="text-sm font-semibold text-gold-light">Detalhamento Dia a Dia</h2>
          <p className="text-[11px] text-gold-muted mt-0.5">{dias.length} dia(s) com movimentação</p>
        </div>
        <ChevronDown size={16} className={`text-gold-muted transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="border-t border-surface-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="text-left px-4 py-2.5 text-gold-muted font-medium uppercase tracking-wider">Data</th>
                <th className="text-right px-4 py-2.5 text-gold-muted font-medium uppercase tracking-wider">Atend.</th>
                <th className="text-right px-4 py-2.5 text-gold-muted font-medium uppercase tracking-wider">Receita</th>
                <th className="text-right px-4 py-2.5 text-gold-muted font-medium uppercase tracking-wider">Gastos</th>
                <th className="text-right px-4 py-2.5 text-gold-muted font-medium uppercase tracking-wider">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {dias.map((d) => {
                const e = mapaEntradas[d] ?? { bruto: 0, comissao: 0, qtd: 0 };
                const s = mapaSaidas[d]   ?? { gastos: 0 };
                const liquido = e.bruto - e.comissao;
                const saldo   = liquido - s.gastos;
                return (
                  <tr key={d} className="border-b border-surface-border/50 hover:bg-surface-hover/30 transition-colors">
                    <td className="px-4 py-2.5 text-gold-light font-medium">{d}</td>
                    <td className="px-4 py-2.5 text-right text-gold-muted">{e.qtd}</td>
                    <td className="px-4 py-2.5 text-right text-gold">{fmt(e.bruto)}</td>
                    <td className="px-4 py-2.5 text-right text-red-400">{s.gastos > 0 ? fmt(-s.gastos) : '—'}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmt(saldo)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function IntelFinanceira() {
  const { dados, loading, erro, filtros, setFiltros, recarregar } = useInteligencia();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 animate-fade-in">
      <FilterBar filtros={filtros} onChange={setFiltros} onRecarregar={recarregar} loading={loading} />

      {erro && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <section className="mb-6">
        <GraficoProjecao dados={dados?.projecao ?? []} loading={loading} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <BreakEvenCard breakEven={dados?.break_even} loading={loading} />
        <TicketMedioCard barbeiros={dados?.ticket_medio_barbeiros ?? []} loading={loading} />
      </section>

      <DetalhamentoDiario
        entradas={dados?.entradas_por_dia}
        saidas={dados?.saidas_por_dia}
        loading={loading}
      />
    </main>
  );
}
