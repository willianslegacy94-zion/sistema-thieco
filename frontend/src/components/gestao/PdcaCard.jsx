import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, CheckCircle, Clock, XCircle, Loader, Trash2 } from 'lucide-react';

const STATUS_CONFIG = {
  pendente:     { label: 'Pendente',     cor: 'border-gold-dark/50 text-gold bg-gold/10',              icon: Clock },
  em_andamento: { label: 'Em Andamento', cor: 'border-blue-600/50 text-blue-400 bg-blue-500/10',       icon: Loader },
  concluido:    { label: 'Concluído',    cor: 'border-emerald-700/50 text-emerald-400 bg-emerald-500/10', icon: CheckCircle },
  cancelado:    { label: 'Cancelado',    cor: 'border-red-800/50 text-red-400 bg-red-500/10',           icon: XCircle },
};

const FASES = [
  { key: 'planejar', sigla: 'P', label: 'Planejar',      cor: 'bg-blue-900/20 border-blue-700/30',    siglaC: 'bg-blue-600 text-white' },
  { key: 'executar', sigla: 'D', label: 'Executar',       cor: 'bg-emerald-900/20 border-emerald-700/30', siglaC: 'bg-emerald-600 text-white' },
  { key: 'checar',   sigla: 'C', label: 'Checar',         cor: 'bg-amber-900/20 border-amber-700/30',  siglaC: 'bg-amber-500 text-black' },
  { key: 'agir',     sigla: 'A', label: 'Agir',           cor: 'bg-red-900/20 border-red-700/30',      siglaC: 'bg-red-600 text-white' },
];

const STATUS_FLOW = ['pendente', 'em_andamento', 'concluido'];

export default function PdcaCard({ pdca, onAtualizar, onDeletar }) {
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);

  const cfg = STATUS_CONFIG[pdca.status] ?? STATUS_CONFIG.pendente;
  const Icon = cfg.icon;

  async function avancarStatus() {
    const idx = STATUS_FLOW.indexOf(pdca.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    setLoading(true);
    await onAtualizar(pdca.id, { status: STATUS_FLOW[idx + 1] });
    setLoading(false);
  }

  const podeAvancar = STATUS_FLOW.indexOf(pdca.status) < STATUS_FLOW.length - 1;

  return (
    <div className={`rounded-xl border transition-all duration-300 overflow-hidden
                     ${pdca.status === 'concluido' ? 'border-emerald-800/30 opacity-80' : 'border-surface-border hover:border-gold-muted hover:shadow-gold-sm'}`}>
      {/* Cabeçalho sempre visível */}
      <div className="p-4 bg-surface-card">
        <div className="flex items-start gap-3">
          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border font-medium shrink-0 mt-0.5 ${cfg.cor}`}>
            <Icon size={11} />
            {cfg.label}
          </span>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gold-light text-sm leading-snug mb-1">{pdca.titulo}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gold-muted">
              <span className="font-medium text-gold-light/70">{pdca.profissional_nome}</span>
              <span className="flex items-center gap-1">
                <Calendar size={10} />
                {new Date(pdca.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
              {pdca.data_meta && (
                <span className="flex items-center gap-1 text-amber-500/70">
                  Meta: {new Date(pdca.data_meta + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-1 shrink-0">
            {podeAvancar && (
              <button
                onClick={avancarStatus}
                disabled={loading}
                className="text-xs px-2 py-1 rounded border border-gold-dark/40 text-gold hover:bg-gold/10 transition-colors disabled:opacity-50"
              >
                {loading ? '...' : 'Avançar →'}
              </button>
            )}
            <button
              onClick={() => setAberto((v) => !v)}
              className="p-1 text-gold-muted hover:text-gold transition-colors"
            >
              {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              onClick={() => onDeletar(pdca.id)}
              className="p-1 text-red-500/40 hover:text-red-400 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid PDCA expandido */}
      {aberto && (
        <div className="grid grid-cols-2 border-t border-surface-border animate-fade-in">
          {FASES.map((fase, i) => (
            <div
              key={fase.key}
              className={`p-4 ${fase.cor} border ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b' : ''} border-surface-border/50`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-5 h-5 rounded text-xs font-black flex items-center justify-center ${fase.siglaC}`}>
                  {fase.sigla}
                </span>
                <span className="text-xs font-semibold text-gold-light/70 uppercase tracking-wider">
                  {fase.label}
                </span>
              </div>
              <p className="text-xs text-gold-light/60 leading-relaxed whitespace-pre-wrap">
                {pdca[fase.key] || <span className="italic text-gold-muted/40">Não preenchido</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
