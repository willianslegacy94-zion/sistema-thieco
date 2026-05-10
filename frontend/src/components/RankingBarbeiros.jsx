import { Trophy, Scissors, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  }).format(v ?? 0);
}

const MEDALHAS = [
  { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', icon: '🥇' },
  { bg: 'bg-gray-400/10',   border: 'border-gray-400/30',   text: 'text-gray-300',   icon: '🥈' },
  { bg: 'bg-amber-700/10',  border: 'border-amber-700/30',  text: 'text-amber-600',  icon: '🥉' },
];

function BarProgresso({ valor, max, visivel }) {
  const pct = visivel && max > 0 ? Math.min((valor / max) * 100, 100) : 0;
  return (
    <div className="h-1 w-full bg-surface-hover rounded-full overflow-hidden mt-1">
      <div
        className="h-full bg-gold-gradient rounded-full transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function RankingBarbeiros({ comissoes, loading }) {
  const { isAdmin, profissionalId } = useAuth();

  if (loading) {
    return (
      <div className="card-premium p-5">
        <div className="h-5 w-40 bg-surface-hover rounded animate-pulse mb-6" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-surface-hover rounded animate-pulse mb-3" />
        ))}
      </div>
    );
  }

  const lista = comissoes?.comissoes ?? [];
  const maxFaturamento = lista.length
    ? Math.max(...lista.filter((c) => c.faturamento_bruto != null).map((c) => parseFloat(c.faturamento_bruto ?? 0)))
    : 0;

  return (
    <div className="card-premium p-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-1">
        <Trophy size={15} className="text-gold" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-muted">
          Ranking de Performance
        </h2>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-gold-dark/30 to-transparent mb-5" />

      {lista.length === 0 ? (
        <p className="text-gold-muted text-sm text-center py-8">Nenhum dado no período.</p>
      ) : (
        <div className="space-y-3">
          {lista.map((barbeiro) => {
            const posicao = (barbeiro.posicao ?? 1) - 1; // 0-based para medalhas
            const medalha = MEDALHAS[posicao] ?? {
              bg: 'bg-surface-hover', border: 'border-surface-border',
              text: 'text-gold-muted', icon: `${posicao + 1}`,
            };

            const isOwn    = parseInt(barbeiro.id) === profissionalId;
            const mostrar  = isAdmin || isOwn;

            return (
              <div
                key={`${barbeiro.id}-${barbeiro.unidade}`}
                className={`rounded-lg border p-4 transition-all duration-200
                            ${medalha.border} ${medalha.bg}
                            ${isOwn && !isAdmin ? 'ring-1 ring-gold/30' : ''}
                            hover:shadow-gold-sm`}
              >
                <div className="flex items-start gap-3">
                  {/* Posição */}
                  <div className={`text-lg leading-none mt-0.5 ${medalha.text} shrink-0 w-6 text-center`}>
                    {medalha.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Scissors size={12} className="text-gold-muted shrink-0" />
                        <span className="font-semibold text-gold-light text-sm truncate">
                          {barbeiro.nome}
                          {isOwn && !isAdmin && (
                            <span className="ml-1 text-xs text-gold/70">(você)</span>
                          )}
                        </span>
                        <span className="badge-unidade shrink-0">
                          {barbeiro.unidade === 'tambore' ? 'Tamboré' : 'Mutinga'}
                        </span>
                      </div>

                      {/* Faturamento — mascarado para barbeiro quando não é o próprio */}
                      {mostrar ? (
                        <span className={`font-serif font-bold text-base shrink-0 ${medalha.text}`}>
                          {fmt(barbeiro.faturamento_bruto)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gold-muted/40 text-xs shrink-0">
                          <Lock size={10} />
                          Restrito
                        </span>
                      )}
                    </div>

                    {/* Barra de progresso — só mostra quando tem dados */}
                    <BarProgresso
                      valor={parseFloat(barbeiro.faturamento_bruto ?? 0)}
                      max={maxFaturamento}
                      visivel={mostrar}
                    />

                    {/* Métricas secundárias */}
                    <div className="flex gap-4 mt-2 text-xs text-gold-light/50">
                      {mostrar ? (
                        <>
                          <span>
                            <span className="text-gold-muted">Atend.:</span>{' '}
                            <strong className="text-gold-light/70">{barbeiro.qtd_atendimentos}</strong>
                          </span>
                          <span>
                            <span className="text-gold-muted">Ticket:</span>{' '}
                            <strong className="text-gold-light/70">{fmt(barbeiro.ticket_medio)}</strong>
                          </span>
                          <span>
                            <span className="text-gold-muted">Comissão:</span>{' '}
                            <strong className="text-gold-light/70">{fmt(barbeiro.comissao_total)}</strong>
                          </span>
                        </>
                      ) : (
                        <span className="text-gold-muted/30 italic text-[11px]">
                          Dados visíveis apenas para o próprio barbeiro
                        </span>
                      )}
                    </div>
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
