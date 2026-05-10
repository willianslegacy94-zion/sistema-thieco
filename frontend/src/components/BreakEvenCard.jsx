import { Target, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  }).format(v ?? 0);
}

function fmtData(iso) {
  if (!iso) return null;
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export default function BreakEvenCard({ breakEven, loading }) {
  if (loading) {
    return (
      <div className="card-premium p-5">
        <div className="h-5 w-56 bg-surface-hover rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="h-16 bg-surface-hover rounded-lg animate-pulse" />
          <div className="h-16 bg-surface-hover rounded-lg animate-pulse" />
        </div>
        <div className="h-5 bg-surface-hover rounded-full animate-pulse" />
      </div>
    );
  }

  const {
    gastos_totais = 0,
    faturamento_atual = 0,
    percentual_cobertura = 0,
    dia_break_even,
    dia_break_even_projetado,
    ja_atingiu,
  } = breakEven ?? {};

  const pct      = Math.min(percentual_cobertura, 100);
  const isAcima  = percentual_cobertura >= 100;
  const barColor = isAcima
    ? 'from-emerald-600 to-emerald-400'
    : percentual_cobertura >= 70
      ? 'from-amber-600 to-amber-400'
      : 'from-red-700 to-red-500';

  const diaDisplay = dia_break_even ?? dia_break_even_projetado;
  const isProjetado = !dia_break_even && !!dia_break_even_projetado;

  return (
    <div className="card-premium p-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-1">
        <Target size={14} className="text-gold-muted" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-muted">
          Ponto de Equilíbrio (Break-even)
        </h2>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-gold-dark/30 to-transparent mb-5" />

      {/* Valores lado a lado */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 rounded-lg bg-surface-hover border border-surface-border">
          <p className="text-[10px] text-gold-muted uppercase tracking-wider mb-1">Faturamento</p>
          <p className="font-serif font-bold text-base text-gold leading-tight">{fmt(faturamento_atual)}</p>
        </div>
        <div className="p-3 rounded-lg bg-surface-hover border border-surface-border">
          <p className="text-[10px] text-gold-muted uppercase tracking-wider mb-1">Total de Gastos</p>
          <p className="font-serif font-bold text-base text-red-400 leading-tight">{fmt(gastos_totais)}</p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className={isAcima ? 'text-emerald-400 font-semibold' : 'text-gold-muted'}>
            {percentual_cobertura.toFixed(1)}% coberto
          </span>
          {diaDisplay && (
            <span className={`flex items-center gap-1 font-medium ${ja_atingiu ? 'text-emerald-400' : 'text-amber-400'}`}>
              {ja_atingiu
                ? <><CheckCircle size={11} /> Atingido dia {fmtData(diaDisplay)}</>
                : isProjetado
                  ? <><TrendingUp size={11} /> Projeção: dia {fmtData(diaDisplay)}</>
                  : <><TrendingUp size={11} /> Dia {fmtData(diaDisplay)}</>
              }
            </span>
          )}
          {!diaDisplay && gastos_totais > 0 && !isAcima && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertTriangle size={11} /> Não atingido no período
            </span>
          )}
        </div>

        <div className="relative h-5 rounded-full bg-surface-hover border border-surface-border overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
          <div className="absolute right-0 top-0 h-full w-0.5 bg-gold-dark/40" />
        </div>

        <div className="flex justify-between text-[10px] text-gold-muted/50 mt-1.5">
          <span>R$ 0</span>
          <span className="text-gold-muted/70">Meta: {fmt(gastos_totais)}</span>
        </div>
      </div>

      {/* Badge de status */}
      <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium
        ${isAcima
          ? 'bg-emerald-900/20 border-emerald-700/30 text-emerald-400'
          : 'bg-red-900/20 border-red-700/30 text-red-400'}`}
      >
        {isAcima ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
        {isAcima
          ? `Lucro no período: ${fmt(faturamento_atual - gastos_totais)}`
          : `Faltam ${fmt(gastos_totais - faturamento_atual)} para cobrir os gastos`
        }
      </div>
    </div>
  );
}
