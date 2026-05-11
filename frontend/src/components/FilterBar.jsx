import { SlidersHorizontal, RefreshCw } from 'lucide-react';

const UNIDADES = [
  { value: '',         label: 'Todas as Unidades' },
  { value: 'tambore',  label: 'Tamboré' },
  { value: 'mutinga',  label: 'Mutinga' },
];

export default function FilterBar({ filtros, onChange, onRecarregar, loading }) {
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
          value={filtros.inicio}
          onChange={(e) => onChange({ ...filtros, inicio: e.target.value })}
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
          value={filtros.fim}
          onChange={(e) => onChange({ ...filtros, fim: e.target.value })}
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
