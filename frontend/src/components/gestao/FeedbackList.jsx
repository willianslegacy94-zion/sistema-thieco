import { Star, TrendingUp, Trash2, Filter } from 'lucide-react';
import { useState } from 'react';

const CATEGORIA_LABEL = {
  atendimento:  'Atendimento',
  tecnica:      'Técnica',
  pontualidade: 'Pontualidade',
  postura:      'Postura',
  limpeza:      'Limpeza',
  outros:       'Outros',
};

function FeedbackItem({ fb, onDeletar }) {
  const isElogio = fb.tipo === 'elogio';
  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 hover:shadow-gold-sm
                  ${isElogio
                    ? 'border-gold-dark/30 bg-gold/5'
                    : 'border-blue-800/30 bg-blue-900/10'}`}
    >
      <div className="flex items-start gap-3">
        {/* Ícone tipo */}
        <div className={`mt-0.5 shrink-0 ${isElogio ? 'text-gold' : 'text-blue-400'}`}>
          {isElogio ? <Star size={16} fill="currentColor" /> : <TrendingUp size={16} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-gold-light text-sm">{fb.titulo}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                              ${isElogio
                                ? 'border-gold-dark/50 text-gold bg-gold/10'
                                : 'border-blue-700/50 text-blue-400 bg-blue-500/10'}`}>
              {isElogio ? 'Elogio' : 'Melhoria'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full border border-surface-border text-gold-muted">
              {CATEGORIA_LABEL[fb.categoria] ?? fb.categoria}
            </span>
          </div>

          <p className="text-sm text-gold-light/60 mb-2 leading-relaxed">{fb.descricao}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gold-muted">
              <span className="font-medium text-gold-light/70">{fb.profissional_nome}</span>
              <span>·</span>
              <span>{new Date(fb.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
            </div>
            <button
              onClick={() => onDeletar(fb.id)}
              className="text-red-500/40 hover:text-red-400 transition-colors p-1 rounded"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackList({ feedbacks, profissionais, onDeletar, onFiltrar, loading }) {
  const [filtroProf, setFiltroProf] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  function aplicar() {
    const p = {};
    if (filtroProf) p.profissional_id = filtroProf;
    if (filtroTipo) p.tipo = filtroTipo;
    onFiltrar(p);
  }

  const elogios  = feedbacks.filter((f) => f.tipo === 'elogio').length;
  const melhorias = feedbacks.filter((f) => f.tipo === 'melhoria').length;

  return (
    <div className="card-premium p-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gold-muted" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-gold-muted">
            Histórico de Feedbacks
          </h3>
        </div>
        {/* Contadores */}
        <div className="flex gap-3 text-xs">
          <span className="text-gold">★ {elogios} elogios</span>
          <span className="text-blue-400">↑ {melhorias} melhorias</span>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-gold-dark/30 to-transparent mb-4" />

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          className="input-dark text-xs"
          value={filtroProf}
          onChange={(e) => setFiltroProf(e.target.value)}
        >
          <option value="">Todos os barbeiros</option>
          {profissionais.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
        <select
          className="input-dark text-xs"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos os tipos</option>
          <option value="elogio">Elogios</option>
          <option value="melhoria">Melhorias</option>
        </select>
        <button className="btn-outline-gold text-xs px-3 py-1.5" onClick={aplicar}>
          Filtrar
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-surface-hover rounded-xl animate-pulse" />
          ))}
        </div>
      ) : feedbacks.length === 0 ? (
        <p className="text-center text-gold-muted py-10 text-sm">
          Nenhum feedback registrado para esse filtro.
        </p>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {feedbacks.map((fb) => (
            <FeedbackItem key={fb.id} fb={fb} onDeletar={onDeletar} />
          ))}
        </div>
      )}
    </div>
  );
}
