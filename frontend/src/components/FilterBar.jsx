import { useState, useEffect } from 'react';
import { SlidersHorizontal, RefreshCw } from 'lucide-react';
import { isValidDate } from '../hooks/useBarbeariaData';

const UNIDADES = [
  { value: '',         label: 'Todas as Unidades' },
  { value: 'tambore',  label: 'Tamboré' },
  { value: 'mutinga',  label: 'Mutinga' },
];

export default function FilterBar({ filtros, onChange, onRecarregar, loading, profissionais }) {
  const [localInicio, setLocalInicio] = useState(filtros.inicio);
  const [localFim,    setLocalFim]    = useState(filtros.fim);

  // Sincroniza quando o pai reseta os filtros (ex: troca de mês)
  useEffect(() => { setLocalInicio(filtros.inicio); }, [filtros.inicio]);
  useEffect(() => { setLocalFim(filtros.fim); },     [filtros.fim]);

  function handleInicio(e) {
    const v = e.target.value;
    setLocalInicio(v);
    if (!v || isValidDate(v)) onChange({ ...filtros, inicio: v });
  }

  function handleFim(e) {
    const v = e.target.value;
    setLocalFim(v);
    if (!v || isValidDate(v)) onChange({ ...filtros, fim: v });
  }

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 py-4 px-1">
      <SlidersHorizontal size={15} className="hidden sm:block text-gold-muted shrink-0" />

      {/* Período início */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gold-muted uppercase tracking-wider whitespace-nowrap w-7 sm:w-auto">
          De
        </label>
        <input
          type="date"
          className="input-dark flex-1 sm:w-36"
          value={localInicio}
          onChange={handleInicio}
        />
      </div>

      {/* Período fim */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gold-muted uppercase tracking-wider whitespace-nowrap w-7 sm:w-auto">
          Até
        </label>
        <input
          type="date"
          className="input-dark flex-1 sm:w-36"
          value={localFim}
          onChange={handleFim}
        />
      </div>

      {/* Unidade */}
      <select
        className="input-dark w-full sm:w-auto"
        value={filtros.unidade}
        onChange={(e) => onChange({ ...filtros, unidade: e.target.value })}
      >
        {UNIDADES.map((u) => (
          <option key={u.value} value={u.value}>{u.label}</option>
        ))}
      </select>

      {/* Barbeiro — apenas quando o pai fornecer a lista */}
      {profissionais && profissionais.length > 0 && (
        <select
          className="input-dark w-full sm:w-auto"
          value={filtros.profissional_id ?? ''}
          onChange={(e) => onChange({ ...filtros, profissional_id: e.target.value })}
        >
          <option value="">Todos os Barbeiros</option>
          {profissionais.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      )}

      {/* Recarregar */}
      <button
        onClick={onRecarregar}
        disabled={loading}
        className="btn-outline-gold justify-center w-full sm:w-auto sm:ml-auto"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        Atualizar
      </button>
    </div>
  );
}
