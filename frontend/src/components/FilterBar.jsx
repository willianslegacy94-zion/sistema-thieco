import { SlidersHorizontal, RefreshCw } from 'lucide-react';

const UNIDADES = [
  { value: '',         label: 'Todas as Unidades' },
  { value: 'tambore',  label: 'Tamboré' },
  { value: 'mutinga',  label: 'Mutinga' },
];

export default function FilterBar({ filtros, onChange, onRecarregar, loading }) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-4 px-1">
      <SlidersHorizontal size={15} className="text-gold-muted shrink-0" />

      {/* Período início */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gold-muted uppercase tracking-wider whitespace-nowrap">
          De
        </label>
        <input
          type="date"
          className="input-dark w-36"
          value={filtros.inicio}
          onChange={(e) => onChange({ ...filtros, inicio: e.target.value })}
        />
      </div>

      {/* Período fim */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gold-muted uppercase tracking-wider whitespace-nowrap">
          Até
        </label>
        <input
          type="date"
          className="input-dark w-36"
          value={filtros.fim}
          onChange={(e) => onChange({ ...filtros, fim: e.target.value })}
        />
      </div>

      {/* Unidade */}
      <select
        className="input-dark"
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
        className="btn-outline-gold ml-auto"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        Atualizar
      </button>
    </div>
  );
}
