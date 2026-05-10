import { useState } from 'react';
import { ClipboardList, Loader2, Send } from 'lucide-react';

const FORM_VAZIO = {
  profissional_id: '',
  titulo: '',
  planejar: '',
  executar: '',
  checar: '',
  agir: '',
  data_meta: '',
};

const FASES = [
  {
    key: 'planejar',
    sigla: 'P',
    label: 'Planejar',
    cor: 'border-blue-700/50 bg-blue-900/10',
    corSigla: 'bg-blue-600 text-white',
    placeholder: 'Qual o problema? Qual o objetivo? Qual é o plano de ação detalhado?',
    required: true,
  },
  {
    key: 'executar',
    sigla: 'D',
    label: 'Executar (Do)',
    cor: 'border-emerald-700/50 bg-emerald-900/10',
    corSigla: 'bg-emerald-600 text-white',
    placeholder: 'O que foi/será feito? Quando? Por quem? Como será executado?',
    required: false,
  },
  {
    key: 'checar',
    sigla: 'C',
    label: 'Checar (Check)',
    cor: 'border-amber-700/50 bg-amber-900/10',
    corSigla: 'bg-amber-500 text-black',
    placeholder: 'Os resultados foram atingidos? O que foi medido e observado?',
    required: false,
  },
  {
    key: 'agir',
    sigla: 'A',
    label: 'Agir (Act)',
    cor: 'border-red-700/50 bg-red-900/10',
    corSigla: 'bg-red-600 text-white',
    placeholder: 'Quais correções foram necessárias? Como padronizar o que funcionou?',
    required: false,
  },
];

export default function PdcaForm({ profissionais, onSalvar, loading }) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [enviado, setEnviado] = useState(false);

  function set(key, val) { setForm((p) => ({ ...p, [key]: val })); }

  async function submit(e) {
    e.preventDefault();
    const ok = await onSalvar({
      ...form,
      profissional_id: parseInt(form.profissional_id),
      data_meta: form.data_meta || undefined,
    });
    if (ok) {
      setEnviado(true);
      setForm(FORM_VAZIO);
      setTimeout(() => setEnviado(false), 2500);
    }
  }

  return (
    <form onSubmit={submit} className="card-premium p-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <ClipboardList size={15} className="text-gold" />
        <h3 className="text-sm font-semibold uppercase tracking-widest text-gold-muted">
          Novo Plano de Ação (P.D.C.A)
        </h3>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-gold-dark/30 to-transparent mb-5" />

      {/* Topo: Barbeiro + Título + Data meta */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
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
        <div className="sm:col-span-2">
          <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">
            Título do Plano *
          </label>
          <input
            required
            type="text"
            placeholder="Ex: Melhoria na finalização do corte degradê"
            className="input-dark w-full"
            value={form.titulo}
            onChange={(e) => set('titulo', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">
            Meta (prazo)
          </label>
          <input
            type="date"
            className="input-dark w-full"
            value={form.data_meta}
            onChange={(e) => set('data_meta', e.target.value)}
          />
        </div>
      </div>

      {/* Grid PDCA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {FASES.map((fase) => (
          <div key={fase.key} className={`rounded-xl border p-4 ${fase.cor}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-6 h-6 rounded-md text-xs font-black flex items-center justify-center ${fase.corSigla}`}>
                {fase.sigla}
              </span>
              <label className="text-xs font-semibold text-gold-light uppercase tracking-wider">
                {fase.label}
                {fase.required && <span className="text-gold ml-1">*</span>}
              </label>
            </div>
            <textarea
              required={fase.required}
              rows={3}
              placeholder={fase.placeholder}
              className="input-dark w-full resize-none bg-transparent text-sm"
              value={form[fase.key]}
              onChange={(e) => set(fase.key, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={loading || enviado} className="btn-gold">
          {loading
            ? <Loader2 size={14} className="animate-spin" />
            : enviado
              ? '✓ Plano Criado!'
              : <><Send size={14} /> Criar Plano de Ação</>
          }
        </button>
        {enviado && (
          <span className="text-emerald-400 text-sm animate-fade-in">
            PDCA criado com sucesso!
          </span>
        )}
      </div>
    </form>
  );
}
