import { Lightbulb, ChevronDown } from 'lucide-react';

const STATUS_OPTS = [
  { value: 'aberta',       label: 'Aberta',       cor: 'text-gold border-gold/40 bg-gold/5' },
  { value: 'em_analise',   label: 'Em Análise',   cor: 'text-blue-400 border-blue-500/40 bg-blue-500/5' },
  { value: 'aprovada',     label: 'Aprovada',     cor: 'text-purple-400 border-purple-500/40 bg-purple-500/5' },
  { value: 'implementada', label: 'Implementada', cor: 'text-emerald-400 border-emerald-600/40 bg-emerald-600/5' },
  { value: 'rejeitada',    label: 'Rejeitada',    cor: 'text-red-400 border-red-600/40 bg-red-600/5' },
];

const PRIORIDADE_COR = {
  alta:  'text-red-400',
  media: 'text-amber-400',
  baixa: 'text-emerald-400',
};

const UNIDADE_LABEL = { tambore: 'Tamboré', mutinga: 'Mutinga', geral: 'Ambas' };

function getStatusConfig(status) {
  return STATUS_OPTS.find((s) => s.value === status) ?? STATUS_OPTS[0];
}

export default function SugestaoList({ sugestoes, onAtualizar, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-hover rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (!sugestoes.length) {
    return (
      <div className="card-premium p-10 text-center">
        <Lightbulb size={32} className="text-gold-muted mx-auto mb-3" strokeWidth={1} />
        <p className="text-gold-muted text-sm">Nenhuma sugestão registrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sugestoes.map((s) => {
        const cfg = getStatusConfig(s.status);
        return (
          <div key={s.id} className="card-premium p-4 hover:shadow-gold-sm transition-all">
            <div className="flex items-start gap-3">
              <Lightbulb size={15} className={`shrink-0 mt-0.5 ${PRIORIDADE_COR[s.prioridade]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-gold-light text-sm">{s.titulo}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.cor}`}>
                    {cfg.label}
                  </span>
                  <span className="badge-unidade">{UNIDADE_LABEL[s.unidade] ?? s.unidade}</span>
                </div>
                <p className="text-xs text-gold-light/60 mb-3 leading-relaxed">{s.descricao}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`text-xs font-medium uppercase ${PRIORIDADE_COR[s.prioridade]}`}>
                    ● {s.prioridade}
                  </span>
                  <span className="text-xs text-gold-muted">
                    {new Date(s.created_at).toLocaleDateString('pt-BR')}
                  </span>

                  {/* Atualizar status */}
                  <div className="ml-auto relative">
                    <select
                      className="input-dark text-xs py-1 px-2 pr-6 appearance-none cursor-pointer"
                      value={s.status}
                      onChange={(e) => onAtualizar(s.id, { status: e.target.value })}
                    >
                      {STATUS_OPTS.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gold-muted pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
