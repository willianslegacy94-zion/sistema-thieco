import { useEffect } from 'react';
import {
  Star, TrendingUp, ClipboardList, CheckCircle,
  Clock, Award, BarChart2, Target,
} from 'lucide-react';

// ─── Configuração visual de cada tipo de evento ───────────────────────────────

const TIPO_CONFIG = {
  feedback_elogio: {
    icon: Star,
    cor:  'bg-gold/10 border-gold-dark/60',
    dotCor: 'bg-gold border-gold-dark',
    textCor: 'text-gold',
    label: 'Elogio',
    lineCor: 'bg-gold/30',
  },
  feedback_melhoria: {
    icon: TrendingUp,
    cor:  'bg-blue-900/20 border-blue-700/40',
    dotCor: 'bg-blue-500 border-blue-700',
    textCor: 'text-blue-400',
    label: 'Ponto de Melhoria',
    lineCor: 'bg-blue-500/30',
  },
  pdca: {
    icon: ClipboardList,
    cor:  'bg-purple-900/20 border-purple-700/40',
    dotCor: 'bg-purple-500 border-purple-700',
    textCor: 'text-purple-400',
    label: 'Plano de Ação Iniciado',
    lineCor: 'bg-purple-500/30',
  },
  pdca_conclusao: {
    icon: CheckCircle,
    cor:  'bg-emerald-900/20 border-emerald-700/40',
    dotCor: 'bg-emerald-500 border-emerald-700',
    textCor: 'text-emerald-400',
    label: 'Plano de Ação Concluído',
    lineCor: 'bg-emerald-500/30',
  },
};

function resolverTipo(evento) {
  if (evento.tipo === 'feedback') {
    return evento.subtipo === 'elogio' ? 'feedback_elogio' : 'feedback_melhoria';
  }
  return evento.tipo; // 'pdca' ou 'pdca_conclusao'
}

function formatarData(raw) {
  if (!raw) return '—';
  const d = new Date(raw + (raw.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Estatísticas no topo ─────────────────────────────────────────────────────

function StatBadge({ icon: Icon, valor, label, cor }) {
  return (
    <div className={`flex flex-col items-center p-3 rounded-xl border ${cor} min-w-[90px]`}>
      <Icon size={18} className="mb-1 opacity-70" />
      <span className="font-serif font-bold text-lg leading-none">{valor}</span>
      <span className="text-xs mt-1 opacity-60 text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Evento individual ────────────────────────────────────────────────────────

function EventoTimeline({ evento, isLast }) {
  const tipoKey = resolverTipo(evento);
  const cfg = TIPO_CONFIG[tipoKey] ?? TIPO_CONFIG['pdca'];
  const Icon = cfg.icon;

  return (
    <div className="flex gap-4 group">
      {/* Coluna do eixo */}
      <div className="flex flex-col items-center shrink-0">
        {/* Ponto */}
        <div className={`w-3 h-3 rounded-full border-2 mt-1 shrink-0 transition-all duration-300 ${cfg.dotCor} group-hover:scale-125`} />
        {/* Linha conectora */}
        {!isLast && (
          <div className={`w-0.5 flex-1 mt-1 min-h-[32px] ${cfg.lineCor}`} />
        )}
      </div>

      {/* Conteúdo */}
      <div className={`flex-1 mb-5 rounded-xl border p-4 ${cfg.cor} transition-all duration-200 hover:shadow-gold-sm`}>
        <div className="flex items-start gap-2 mb-1">
          <Icon size={13} className={`${cfg.textCor} mt-0.5 shrink-0`} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${cfg.textCor}`}>
                {cfg.label}
              </span>
              <span className="text-xs text-gold-muted">
                {formatarData(evento.data)}
              </span>
            </div>
            <p className="text-sm font-semibold text-gold-light leading-snug mb-1">
              {evento.titulo}
            </p>
            {evento.descricao && (
              <p className="text-xs text-gold-light/55 leading-relaxed line-clamp-3">
                {evento.descricao}
              </p>
            )}
            {evento.extra && (
              <p className="text-xs text-gold-muted mt-1 flex items-center gap-1">
                <Target size={10} />
                Meta: {formatarData(evento.extra)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TimelineBarbeiro({
  profissionais,
  profissionalSelecionado,
  onSelecionar,
  timeline,
  loading,
}) {
  const prof = timeline?.profissional;
  const stats = timeline?.stats;
  const eventos = timeline?.timeline ?? [];

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Seletor de barbeiro */}
      <div className="card-premium p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-gold-muted uppercase tracking-wider shrink-0">
            Barbeiro:
          </span>
          <div className="flex gap-2 flex-wrap">
            {profissionais.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelecionar(p.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200
                            ${profissionalSelecionado === p.id
                              ? 'bg-gold-gradient text-onix-300 border-gold shadow-gold-sm'
                              : 'border-surface-border text-gold-muted hover:border-gold-muted'}`}
              >
                {p.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card-premium p-6 space-y-3">
          <div className="h-16 bg-surface-hover rounded-xl animate-pulse" />
          {[1,2,3].map((i) => <div key={i} className="h-20 bg-surface-hover rounded-xl animate-pulse" />)}
        </div>
      )}

      {/* Placeholder */}
      {!loading && !timeline && (
        <div className="card-premium p-12 text-center">
          <BarChart2 size={40} className="text-gold-muted mx-auto mb-3" strokeWidth={1} />
          <p className="text-gold-muted text-sm">Selecione um barbeiro para ver a timeline de evolução.</p>
        </div>
      )}

      {/* Conteúdo */}
      {!loading && timeline && (
        <>
          {/* Cabeçalho do barbeiro */}
          <div className="card-premium p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-gold">{prof?.nome}</h3>
                <p className="text-xs text-gold-muted uppercase tracking-wider mt-0.5">
                  Timeline de Evolução
                </p>
              </div>
              {/* Stats */}
              <div className="flex gap-2 flex-wrap">
                <StatBadge
                  icon={Star}
                  valor={stats?.total_elogios ?? 0}
                  label="Elogios"
                  cor="border-gold-dark/40 text-gold"
                />
                <StatBadge
                  icon={TrendingUp}
                  valor={stats?.total_melhorias ?? 0}
                  label="Melhorias"
                  cor="border-blue-700/40 text-blue-400"
                />
                <StatBadge
                  icon={ClipboardList}
                  valor={stats?.total_pdca ?? 0}
                  label="PDCAs"
                  cor="border-purple-700/40 text-purple-400"
                />
                <StatBadge
                  icon={Award}
                  valor={stats?.pdca_concluidos ?? 0}
                  label="Concluídos"
                  cor="border-emerald-700/40 text-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card-premium p-5">
            <h4 className="text-xs text-gold-muted uppercase tracking-widest mb-5">
              Linha do Tempo — do mais recente ao mais antigo
            </h4>

            {eventos.length === 0 ? (
              <div className="text-center py-10">
                <Clock size={32} className="text-gold-muted mx-auto mb-3" strokeWidth={1} />
                <p className="text-gold-muted text-sm">
                  Nenhum evento registrado ainda.<br />
                  <span className="text-xs opacity-60">
                    Adicione feedbacks ou planos de ação para construir a timeline.
                  </span>
                </p>
              </div>
            ) : (
              <div>
                {eventos.map((ev, i) => (
                  <EventoTimeline
                    key={`${ev.tipo}-${ev.ref_id}-${i}`}
                    evento={ev}
                    isLast={i === eventos.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
