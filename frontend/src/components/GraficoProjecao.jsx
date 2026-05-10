import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

function fmtBRL(v) {
  if (v == null) return '';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-gold-dark/40 rounded-lg p-3 shadow-gold-sm text-xs">
      <p className="text-gold-muted uppercase tracking-wider mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gold-light/70">{p.name === 'real' ? 'Realizado' : 'Projetado'}:</span>
          <span className="font-semibold" style={{ color: p.color }}>{fmtBRL(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function GraficoProjecao({ dados, loading }) {
  if (loading) {
    return (
      <div className="card-premium p-5">
        <div className="h-5 w-48 bg-surface-hover rounded animate-pulse mb-6" />
        <div className="h-56 bg-surface-hover rounded animate-pulse" />
      </div>
    );
  }

  if (!dados?.length) {
    return (
      <div className="card-premium p-5 flex items-center justify-center h-64">
        <p className="text-gold-muted text-sm">Sem dados para o período selecionado.</p>
      </div>
    );
  }

  // Índice do último dia com dado real (ponto de junção)
  const ultimoRealIdx = dados.reduce((acc, d, i) => (d.real != null ? i : acc), -1);

  return (
    <div className="card-premium p-5 animate-slide-up">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-muted">
          Projeção de Ganhos — Mês Atual
        </h2>
        <div className="flex items-center gap-4 text-xs text-gold-light/50">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 bg-gold rounded" />
            Realizado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 bg-gold/40 rounded border-t border-dashed border-gold/60" />
            Projetado
          </span>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-gold-dark/30 to-transparent mb-5" />

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={dados} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(212,175,55,0.08)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: '#9C7B1E', fontSize: 10, fontFamily: 'Inter' }}
            axisLine={{ stroke: 'rgba(212,175,55,0.15)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => fmtBRL(v)}
            tick={{ fill: '#9C7B1E', fontSize: 10, fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Linha de hoje */}
          {ultimoRealIdx >= 0 && (
            <ReferenceLine
              x={dados[ultimoRealIdx]?.label}
              stroke="rgba(212,175,55,0.4)"
              strokeDasharray="4 4"
              label={{ value: 'Hoje', fill: '#D4AF37', fontSize: 10, position: 'top' }}
            />
          )}

          {/* Linha real */}
          <Line
            type="monotone"
            dataKey="real"
            name="real"
            stroke="#D4AF37"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#D4AF37', stroke: '#0F0E0A', strokeWidth: 2 }}
            connectNulls={false}
          />

          {/* Linha projetada */}
          <Line
            type="monotone"
            dataKey="projecao"
            name="projecao"
            stroke="#D4AF37"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 4, fill: '#C9A227', stroke: '#0F0E0A', strokeWidth: 2 }}
            connectNulls={false}
            opacity={0.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
