function fmt(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(v ?? 0);
}

export default function MetricCard({ titulo, valor, sub, icon: Icon, variante = 'default', loading }) {
  const cores = {
    default:  { border: 'border-surface-border', icon: 'text-gold',       valor: 'text-gold' },
    sucesso:  { border: 'border-emerald-800/50',  icon: 'text-emerald-400', valor: 'text-emerald-400' },
    perigo:   { border: 'border-red-900/50',       icon: 'text-red-400',    valor: 'text-red-400' },
    alerta:   { border: 'border-amber-800/50',     icon: 'text-amber-400',  valor: 'text-amber-300' },
  }[variante];

  return (
    <div className={`card-premium border ${cores.border} p-5 animate-slide-up`}>
      {/* Topo */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs uppercase tracking-widest text-gold-muted font-semibold">
          {titulo}
        </span>
        {Icon && (
          <div className={`${cores.icon} opacity-70`}>
            <Icon size={18} strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Valor principal */}
      {loading ? (
        <div className="h-8 w-32 bg-surface-hover rounded animate-pulse" />
      ) : (
        <p className={`font-serif font-bold text-2xl sm:text-3xl leading-none ${cores.valor}`}>
          {fmt(valor)}
        </p>
      )}

      {/* Sub-info */}
      {sub && !loading && (
        <p className="mt-2 text-xs text-gold-light/50">{sub}</p>
      )}

      {/* Linha decorativa base */}
      <div className={`mt-4 h-px bg-gradient-to-r from-transparent via-gold-dark/30 to-transparent`} />
    </div>
  );
}
