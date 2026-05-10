import { useState } from 'react';
import { Star, TrendingUp, Send, Loader2 } from 'lucide-react';

const CATEGORIAS = [
  { value: 'atendimento',  label: 'Atendimento ao Cliente' },
  { value: 'tecnica',      label: 'Técnica / Execução' },
  { value: 'pontualidade', label: 'Pontualidade' },
  { value: 'postura',      label: 'Postura Profissional' },
  { value: 'limpeza',      label: 'Organização / Limpeza' },
  { value: 'outros',       label: 'Outros' },
];

const FORM_VAZIO = {
  profissional_id: '',
  tipo: 'elogio',
  categoria: 'atendimento',
  titulo: '',
  descricao: '',
  data: new Date().toISOString().slice(0, 10),
};

export default function FeedbackForm({ profissionais, onSalvar, loading }) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [enviado, setEnviado] = useState(false);

  function set(key, val) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  async function submit(e) {
    e.preventDefault();
    const ok = await onSalvar({
      ...form,
      profissional_id: parseInt(form.profissional_id),
    });
    if (ok) {
      setEnviado(true);
      setForm(FORM_VAZIO);
      setTimeout(() => setEnviado(false), 2500);
    }
  }

  const isElogio = form.tipo === 'elogio';

  return (
    <form onSubmit={submit} className="card-premium p-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        {isElogio
          ? <Star size={15} className="text-gold" />
          : <TrendingUp size={15} className="text-blue-400" />
        }
        <h3 className="text-sm font-semibold uppercase tracking-widest text-gold-muted">
          Registrar Feedback
        </h3>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-gold-dark/30 to-transparent mb-5" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Profissional */}
        <div>
          <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">
            Barbeiro *
          </label>
          <select
            required
            className="input-dark w-full"
            value={form.profissional_id}
            onChange={(e) => set('profissional_id', e.target.value)}
          >
            <option value="">Selecione...</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">
            Tipo *
          </label>
          <div className="flex gap-2">
            {[
              { value: 'elogio',   label: 'Elogio',   cor: 'border-gold text-gold bg-gold/10' },
              { value: 'melhoria', label: 'Melhoria',  cor: 'border-blue-500 text-blue-400 bg-blue-500/10' },
            ].map((op) => (
              <button
                key={op.value}
                type="button"
                onClick={() => set('tipo', op.value)}
                className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all duration-200
                            ${form.tipo === op.value ? op.cor : 'border-surface-border text-gold-muted hover:border-gold-muted'}`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">
            Categoria *
          </label>
          <select
            required
            className="input-dark w-full"
            value={form.categoria}
            onChange={(e) => set('categoria', e.target.value)}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Data */}
        <div>
          <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">
            Data
          </label>
          <input
            type="date"
            className="input-dark w-full"
            value={form.data}
            onChange={(e) => set('data', e.target.value)}
          />
        </div>

        {/* Título */}
        <div className="sm:col-span-2">
          <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">
            Título *
          </label>
          <input
            required
            type="text"
            placeholder="Ex: Excelente atendimento ao cliente"
            className="input-dark w-full"
            value={form.titulo}
            onChange={(e) => set('titulo', e.target.value)}
          />
        </div>

        {/* Descrição */}
        <div className="sm:col-span-2">
          <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">
            Descrição *
          </label>
          <textarea
            required
            rows={3}
            placeholder="Descreva em detalhes o elogio ou ponto de melhoria..."
            className="input-dark w-full resize-none"
            value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 mt-5">
        <button
          type="submit"
          disabled={loading || enviado}
          className={`btn-gold ${enviado ? 'bg-emerald-500/80' : ''}`}
        >
          {loading
            ? <Loader2 size={14} className="animate-spin" />
            : enviado
              ? '✓ Registrado!'
              : <><Send size={14} /> Registrar Feedback</>
          }
        </button>
        {enviado && (
          <span className="text-emerald-400 text-sm animate-fade-in">
            Feedback salvo com sucesso!
          </span>
        )}
      </div>
    </form>
  );
}
