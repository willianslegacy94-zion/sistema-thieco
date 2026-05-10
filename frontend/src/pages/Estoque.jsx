import { useState, useEffect, useRef } from 'react';
import { Package, Plus, Pencil, Check, X, AlertTriangle, ChevronDown, ChevronUp, Minus } from 'lucide-react';
import { api } from '../lib/api';

const CATEGORIAS = [
  { value: '',               label: 'Todos'       },
  { value: 'servico',        label: 'Serviços'    },
  { value: 'combo',          label: 'Combos'      },
  { value: 'produto_capilar',label: 'Capilares'   },
  { value: 'bebida',         label: 'Bebidas'     },
  { value: 'snack',          label: 'Snacks'      },
  { value: 'vestuario',      label: 'Vestuário'   },
  { value: 'outro',          label: 'Outros'      },
];

const CAT_LABEL = Object.fromEntries(CATEGORIAS.slice(1).map(c => [c.value, c.label]));
const CAT_COR = {
  servico:         'bg-blue-900/40 text-blue-300',
  combo:           'bg-purple-900/40 text-purple-300',
  produto_capilar: 'bg-amber-900/40 text-amber-300',
  bebida:          'bg-cyan-900/40 text-cyan-300',
  snack:           'bg-green-900/40 text-green-300',
  vestuario:       'bg-pink-900/40 text-pink-300',
  outro:           'bg-slate-700/60 text-slate-300',
};

const BRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const FORM_VAZIO = {
  nome: '', categoria: 'servico', preco_venda: '', preco_custo: '',
  quantidade: 0, quantidade_minima: 0, unidade_medida: 'un', controla_estoque: false,
};

function LinhaItem({ item, onSave, onAjustarQtd }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ ...item });
  const [ajustando, setAjustando] = useState(false);
  const [delta, setDelta] = useState('');
  const [salvando, setSalvando] = useState(false);

  const baixoEstoque = item.controla_estoque && item.quantidade <= item.quantidade_minima && item.quantidade_minima > 0;

  async function salvar() {
    setSalvando(true);
    await onSave(item.id, {
      nome: form.nome,
      categoria: form.categoria,
      preco_venda: parseFloat(form.preco_venda) || 0,
      preco_custo: form.preco_custo ? parseFloat(form.preco_custo) : null,
      quantidade_minima: parseInt(form.quantidade_minima) || 0,
      unidade_medida: form.unidade_medida,
      controla_estoque: form.controla_estoque,
      ativo: form.ativo,
    });
    setSalvando(false);
    setEditando(false);
  }

  async function confirmarAjuste(sinal) {
    const d = parseInt(delta);
    if (!d || isNaN(d)) return;
    await onAjustarQtd(item.id, d * sinal);
    setDelta('');
    setAjustando(false);
  }

  if (editando) {
    return (
      <tr className="bg-onix-300/40">
        <td className="px-3 py-2">
          <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            className="input-dark w-full text-sm" />
        </td>
        <td className="px-3 py-2">
          <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            className="input-dark text-sm">
            {CATEGORIAS.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </td>
        <td className="px-3 py-2">
          <input type="number" value={form.preco_venda} onChange={e => setForm(f => ({ ...f, preco_venda: e.target.value }))}
            step="0.01" min="0" className="input-dark w-28 text-sm" />
        </td>
        <td className="px-3 py-2">
          <input type="number" value={form.preco_custo ?? ''} onChange={e => setForm(f => ({ ...f, preco_custo: e.target.value }))}
            step="0.01" min="0" placeholder="—" className="input-dark w-28 text-sm" />
        </td>
        <td className="px-3 py-2 text-center">
          <label className="flex items-center gap-2 justify-center cursor-pointer">
            <input type="checkbox" checked={form.controla_estoque}
              onChange={e => setForm(f => ({ ...f, controla_estoque: e.target.checked }))}
              className="accent-gold w-4 h-4" />
            {form.controla_estoque && (
              <input type="number" value={form.quantidade_minima}
                onChange={e => setForm(f => ({ ...f, quantidade_minima: e.target.value }))}
                min="0" className="input-dark w-16 text-sm ml-1" placeholder="mín" />
            )}
          </label>
        </td>
        <td className="px-3 py-2 text-center">—</td>
        <td className="px-3 py-2">
          <div className="flex gap-2">
            <button onClick={salvar} disabled={salvando}
              className="p-1.5 rounded-lg bg-emerald-700/30 text-emerald-400 hover:bg-emerald-700/50 transition-colors">
              <Check size={13} />
            </button>
            <button onClick={() => { setEditando(false); setForm({ ...item }); }}
              className="p-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors">
              <X size={13} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b border-surface-border/30 hover:bg-onix-300/20 transition-colors ${!item.ativo ? 'opacity-40' : ''}`}>
      <td className="px-3 py-2.5 text-sm text-gold-light">
        <div className="flex items-center gap-2">
          {baixoEstoque && <AlertTriangle size={13} className="text-amber-400 shrink-0" />}
          {item.nome}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAT_COR[item.categoria] ?? CAT_COR.outro}`}>
          {CAT_LABEL[item.categoria] ?? item.categoria}
        </span>
      </td>
      <td className="px-3 py-2.5 text-sm font-semibold text-gold">{BRL(item.preco_venda)}</td>
      <td className="px-3 py-2.5 text-sm text-slate-400">{item.preco_custo ? BRL(item.preco_custo) : '—'}</td>
      <td className="px-3 py-2.5 text-center">
        {item.controla_estoque
          ? <span className={`text-sm font-semibold ${baixoEstoque ? 'text-amber-400' : 'text-emerald-400'}`}>
              {item.quantidade} <span className="text-gold-muted text-xs font-normal">/ mín {item.quantidade_minima}</span>
            </span>
          : <span className="text-gold-muted text-xs">—</span>}
      </td>
      <td className="px-3 py-2.5 text-center">
        {item.controla_estoque && (
          ajustando ? (
            <div className="flex items-center gap-1 justify-center">
              <button onClick={() => confirmarAjuste(-1)}
                className="p-1 rounded bg-red-900/40 text-red-400 hover:bg-red-900/60"><Minus size={11} /></button>
              <input type="number" value={delta} onChange={e => setDelta(e.target.value)}
                min="1" className="input-dark w-14 text-center text-xs py-0.5 px-1" placeholder="qtd" />
              <button onClick={() => confirmarAjuste(1)}
                className="p-1 rounded bg-emerald-800/40 text-emerald-400 hover:bg-emerald-800/60"><Plus size={11} /></button>
              <button onClick={() => setAjustando(false)}
                className="p-1 rounded bg-surface-border/40 text-gold-muted hover:text-gold"><X size={11} /></button>
            </div>
          ) : (
            <button onClick={() => setAjustando(true)}
              className="text-[10px] text-gold-muted hover:text-gold transition-colors underline underline-offset-2">
              ajustar
            </button>
          )
        )}
      </td>
      <td className="px-3 py-2.5">
        <button onClick={() => setEditando(true)}
          className="p-1.5 rounded-lg bg-onix-300/60 text-gold-muted hover:text-gold hover:bg-onix-300 transition-colors">
          <Pencil size={12} />
        </button>
      </td>
    </tr>
  );
}

function FormNovoItem({ onCriar, onCancelar }) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    await onCriar({
      ...form,
      preco_venda: parseFloat(form.preco_venda) || 0,
      preco_custo: form.preco_custo ? parseFloat(form.preco_custo) : null,
      quantidade: parseInt(form.quantidade) || 0,
      quantidade_minima: parseInt(form.quantidade_minima) || 0,
    });
    setSalvando(false);
  }

  return (
    <tr className="bg-gold/5 border-b border-gold/20">
      <td className="px-3 py-2">
        <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          required placeholder="Nome do item" className="input-dark w-full text-sm" />
      </td>
      <td className="px-3 py-2">
        <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
          className="input-dark text-sm">
          {CATEGORIAS.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <input type="number" value={form.preco_venda} onChange={e => setForm(f => ({ ...f, preco_venda: e.target.value }))}
          step="0.01" min="0" placeholder="0,00" className="input-dark w-28 text-sm" />
      </td>
      <td className="px-3 py-2">
        <input type="number" value={form.preco_custo} onChange={e => setForm(f => ({ ...f, preco_custo: e.target.value }))}
          step="0.01" min="0" placeholder="—" className="input-dark w-28 text-sm" />
      </td>
      <td className="px-3 py-2 text-center">
        <label className="flex items-center gap-2 justify-center cursor-pointer">
          <input type="checkbox" checked={form.controla_estoque}
            onChange={e => setForm(f => ({ ...f, controla_estoque: e.target.checked }))}
            className="accent-gold w-4 h-4" />
          {form.controla_estoque && (
            <input type="number" value={form.quantidade_minima}
              onChange={e => setForm(f => ({ ...f, quantidade_minima: e.target.value }))}
              min="0" className="input-dark w-16 text-sm ml-1" placeholder="mín" />
          )}
        </label>
      </td>
      <td className="px-3 py-2 text-center">
        {form.controla_estoque && (
          <input type="number" value={form.quantidade}
            onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
            min="0" className="input-dark w-20 text-sm text-center" placeholder="0" />
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-2">
          <button onClick={salvar} disabled={salvando || !form.nome}
            className="p-1.5 rounded-lg bg-gold/20 text-gold hover:bg-gold/30 transition-colors disabled:opacity-40">
            <Check size={13} />
          </button>
          <button onClick={onCancelar}
            className="p-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors">
            <X size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Estoque() {
  const [itens, setItens] = useState([]);
  const [catFiltro, setCatFiltro] = useState('');
  const [busca, setBusca] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [erro, setErro] = useState(null);

  async function carregar() {
    try {
      const data = await api.catalogo({ ativo: 'true' });
      setItens(Array.isArray(data) ? data : []);
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => { carregar(); }, []);

  const itensFiltrados = itens.filter(item => {
    if (catFiltro && item.categoria !== catFiltro) return false;
    if (busca && !item.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const alertas = itens.filter(i => i.controla_estoque && i.quantidade <= i.quantidade_minima && i.quantidade_minima > 0);

  async function onSave(id, campos) {
    try {
      const updated = await api.atualizarCatalogo(id, campos);
      setItens(prev => prev.map(i => i.id === id ? updated : i));
    } catch (e) {
      setErro(e.message);
    }
  }

  async function onAjustarQtd(id, delta) {
    try {
      const updated = await api.ajustarEstoque(id, delta);
      setItens(prev => prev.map(i => i.id === id ? updated : i));
    } catch (e) {
      setErro(e.message);
    }
  }

  async function onCriar(dados) {
    try {
      const novo = await api.criarCatalogo(dados);
      setItens(prev => [...prev, novo]);
      setAdicionando(false);
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 pb-16 pt-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold-dark/40 flex items-center justify-center shadow-gold-sm">
            <Package size={18} className="text-gold" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-serif font-bold text-xl text-gold">Estoque & Preços</h1>
            <p className="text-[11px] text-gold-muted uppercase tracking-widest">{itens.length} itens cadastrados</p>
          </div>
        </div>
        <button onClick={() => setAdicionando(true)} disabled={adicionando}
          className="btn-gold text-sm disabled:opacity-50">
          <Plus size={14} /> Novo item
        </button>
      </div>

      {/* Alertas de estoque baixo */}
      {alertas.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-900/20 border border-amber-700/40 flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-sm font-semibold mb-0.5">Estoque baixo em {alertas.length} item(s)</p>
            <p className="text-amber-400/70 text-xs">{alertas.map(a => a.nome).join(' · ')}</p>
          </div>
        </div>
      )}

      {erro && (
        <div className="mb-4 p-3 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 text-sm">
          {erro} <button onClick={() => setErro(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

      {/* Filtros */}
      <div className="card-premium p-4 mb-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {CATEGORIAS.map(c => (
            <button key={c.value}
              onClick={() => setCatFiltro(c.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                catFiltro === c.value
                  ? 'bg-gold text-onix'
                  : 'bg-onix-300/60 text-gold-muted hover:text-gold'
              }`}>
              {c.label}
            </button>
          ))}
        </div>
        <input
          type="text" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome…"
          className="input-dark w-full sm:w-72 text-sm"
        />
      </div>

      {/* Tabela */}
      <div className="card-premium overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="px-3 py-3 text-[10px] text-gold-muted uppercase tracking-wider">Nome</th>
              <th className="px-3 py-3 text-[10px] text-gold-muted uppercase tracking-wider">Categoria</th>
              <th className="px-3 py-3 text-[10px] text-gold-muted uppercase tracking-wider">Preço Venda</th>
              <th className="px-3 py-3 text-[10px] text-gold-muted uppercase tracking-wider">Preço Custo</th>
              <th className="px-3 py-3 text-[10px] text-gold-muted uppercase tracking-wider text-center">Estoque / Mínimo</th>
              <th className="px-3 py-3 text-[10px] text-gold-muted uppercase tracking-wider text-center">Ajustar</th>
              <th className="px-3 py-3 text-[10px] text-gold-muted uppercase tracking-wider">Editar</th>
            </tr>
          </thead>
          <tbody>
            {adicionando && (
              <FormNovoItem onCriar={onCriar} onCancelar={() => setAdicionando(false)} />
            )}
            {itensFiltrados.length === 0 && !adicionando ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gold-muted text-sm">Nenhum item encontrado.</td></tr>
            ) : (
              itensFiltrados.map(item => (
                <LinhaItem key={item.id} item={item} onSave={onSave} onAjustarQtd={onAjustarQtd} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gold-muted mt-3 text-right">{itensFiltrados.length} itens exibidos</p>
    </main>
  );
}
