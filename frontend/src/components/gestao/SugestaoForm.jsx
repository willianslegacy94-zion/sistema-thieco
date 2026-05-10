import { useState } from 'react';
import { Lightbulb, Loader2, Send, ChevronDown } from 'lucide-react';

const CATEGORIAS_SUGE = [
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'espaco',      label: 'Espaço Físico' },
  { value: 'servicos',    label: 'Serviços' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'financeiro',  label: 'Financeiro' },
  { value: 'processos',   label: 'Processos Internos' },
  { value: 'outros',      label: 'Outros' },
];

const UNIDADES_SUGE = [
  { value: 'tambore', label: 'Tamboré' },
  { value: 'mutinga', label: 'Mutinga' },
  { value: 'geral',   label: 'Ambas as Unidades' },
];

const PRIORIDADES = [
  { value: 'alta',  label: '🔴 Alta',  cor: 'border-red-600/50 text-red-400 bg-red-500/10' },
  { value: 'media', label: '🟡 Média', cor: 'border-amber-600/50 text-amber-400 bg-amber-500/10' },
  { value: 'baixa', label: '🟢 Baixa', cor: 'border-emerald-700/50 text-emerald-400 bg-emerald-500/10' },
];

const FORM_VAZIO = {
  unidade: 'geral',
  categoria: 'atendimento',
  titulo: '',
  descricao: '',
  prioridade: 'media',
};

export default function SugestaoForm({ onSalvar, loading }) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [enviado, setEnviado] = useState(false);

  function set(key, val) { setForm((p) => ({ ...p, [key]: val })); }

  async function submit(e) {
    e.preventDefault();
    const ok = await onSalvar(form);
    if (ok) {
      setEnviado(true);
      setForm(FORM_VAZIO);
      setTimeout(() => setEnviado(false), 2500);
    }
  }

  return (
    <form onSubmit={submit} className="card-premium p-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-1">
        <Lightbulb size={15} className="text-gold" />
        <h3 className="text-sm font-semibold uppercase tracking-widest text-gold-muted">
          Nova Sugestão de Melhoria
        </h3>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-gold-dark/30 to-transparent mb-5" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Unidade */}
        <div>
          <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">Unidade *</label>
          <select required className="input-dark w-full" value={form.unidade} onChange={(e) => set('unidade', e.target.value)}>
            {UNIDADES_SUGE.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">Categoria *</label>
          <select required className="input-dark w-full" value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
            {CATEGORIAS_SUGE.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Prioridade */}
        <div>
          <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">Prioridade</label>
          <div className="flex gap-1.5">
            {PRIORIDADES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => set('prioridade', p.value)}
                className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-all duration-200
                            ${form.prioridade === p.value ? p.cor : 'border-surface-border text-gold-muted hover:border-gold-muted'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Título */}
        <div className="sm:col-span-3">
          <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">Título *</label>
          <input
            required
            type="text"
            placeholder="Ex: Implementar sistema de agendamento online na Tamboré"
            className="input-dark w-full"
            value={form.titulo}
            onChange={(e) => set('titulo', e.target.value)}
          />
        </div>

        {/* Descrição */}
        <div className="sm:col-span-3">
          <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">Descrição *</label>
          <textarea
            required
            rows={4}
            placeholder="Detalhe a sugestão: o que deve ser feito, por que é importante, impacto esperado..."
            className="input-dark w-full resize-none"
            value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button type="submit" disabled={loading || enviado} className="btn-gold">
          {loading
            ? <Loader2 size={14} className="animate-spin" />
            : enviado ? '✓ Registrada!' : <><Send size={14} /> Registrar Sugestão</>
          }
        </button>
        {enviado && <span className="text-emerald-400 text-sm animate-fade-in">Sugestão salva!</span>}
      </div>
    </form>
  );
}
