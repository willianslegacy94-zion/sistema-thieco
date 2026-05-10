import { Crown, BarChart2 } from 'lucide-react';

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  }).format(v ?? 0);
}

export default function TicketMedioCard({ barbeiros = [], loading }) {
  if (loading) {
    return (
      <div className="card-premium p-5">
        <div className="h-5 w-48 bg-surface-hover rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-32 bg-surface-hover rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const maxTicket = Math.max(...barbeiros.map((b) => parseFloat(b.ticket_medio ?? 0)));

  return (
    <div className="card-premium p-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-1">
        <BarChart2 size={14} className="text-gold-muted" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-muted">
          Ticket Médio por Barbeiro
        </h2>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-gold-dark/30 to-transparent mb-5" />

      {barbeiros.length === 0 ? (
        <p className="text-gold-muted text-sm text-center py-8">Sem atendimentos no período.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {barbeiros.map((b) => {
            const isLider = parseFloat(b.ticket_medio ?? 0) === maxTicket && maxTicket > 0;
            return (
              <div
                key={b.id}
                className={`relative p-4 rounded-xl border transition-all duration-200
                  ${isLider
                    ? 'bg-gold/5 border-gold-dark/50 shadow-gold-sm'
                    : 'bg-surface-hover border-surface-border'}`}
              >
                {isLider && (
                  <div className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-gold rounded-full flex items-center justify-center shadow-gold-sm">
                    <Crown size={12} className="text-onix-300" />
                  </div>
                )}

                {/* Avatar + nome */}
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${isLider ? 'bg-gold/20 text-gold' : 'bg-surface-border text-gold-muted'}`}>
                    {b.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-semibold text-sm truncate ${isLider ? 'text-gold' : 'text-gold-light'}`}>
                      {b.nome}
                    </p>
                    <p className="text-[10px] text-gold-muted uppercase tracking-wider">{b.unidade}</p>
                  </div>
                </div>

                {/* Ticket médio em destaque */}
                <div className="mb-3">
                  <p className="text-[10px] text-gold-muted uppercase tracking-wider mb-0.5">Ticket Médio</p>
                  <p className={`font-serif font-bold text-xl leading-none ${isLider ? 'text-gold' : 'text-gold-light'}`}>
                    {fmt(b.ticket_medio)}
                  </p>
                </div>

                {/* Métricas secundárias */}
                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-surface-border">
                  <div>
                    <p className="text-[10px] text-gold-muted leading-none mb-0.5">Atendimentos</p>
                    <p className="text-xs font-semibold text-gold-light">{b.qtd_atendimentos}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gold-muted leading-none mb-0.5">Faturamento</p>
                    <p className="text-xs font-semibold text-gold-light">{fmt(b.faturamento_bruto)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
