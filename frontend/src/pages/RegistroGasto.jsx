import { useState, useEffect } from 'react';
import { Receipt, CheckCircle, AlertCircle, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { api } from '../lib/api';

const CATEGORIAS = [
  { value: 'aluguel',       label: 'Aluguel' },
  { value: 'produtos',      label: 'Produtos' },
  { value: 'salario',       label: 'Salário' },
  { value: 'marketing',     label: 'Marketing' },
  { value: 'manutencao',    label: 'Manutenção' },
  { value: 'equipamentos',  label: 'Equipamentos' },
  { value: 'outros',        label: 'Outros' },
];

const UNIDADES = [
  { value: 'tambore', label: 'Tamboré' },
  { value: 'mutinga', label: 'Mutinga' },
];

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function mesAtual() {
  const hoje = new Date();
  return {
    inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10),
    fim:    new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

function isValidDate(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  if (parseInt(s, 10) < 2000) return false;
  const d = new Date(s + 'T00:00:00');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const FORM_INICIAL = {
  unidade:        'tambore',
  categoria:      'outros',
  descricao:      '',
  valor:          '',
  valor_previsto: '',
  data:           hojeISO(),
  observacao:     '',
};

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// ─── Modal de Edição ──────────────────────────────────────────────────────────

function ModalEditarGasto({ gasto, onSalvar, onFechar, salvando, erroSalvar }) {
  const [form, setForm] = useState({
    unidade:        gasto.unidade ?? 'tambore',
    categoria:      gasto.categoria ?? 'outros',
    descricao:      gasto.descricao ?? '',
    valor:          parseFloat(gasto.valor).toFixed(2),
    valor_previsto: gasto.valor_previsto ? parseFloat(gasto.valor_previsto).toFixed(2) : '',
    data:           String(gasto.data).slice(0, 10),
    observacao:     gasto.observacao ?? '',
  });

  function onChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function onSubmit(e) {
    e.preventDefault();
    const payload = {
      unidade:    form.unidade,
      categoria:  form.categoria,
      descricao:  form.descricao.trim(),
      valor:      parseFloat(form.valor),
      data:       form.data,
      ...(form.valor_previsto ? { valor_previsto: parseFloat(form.valor_previsto) } : { valor_previsto: null }),
      observacao: form.observacao.trim() || null,
    };
    onSalvar(gasto.id, payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-onix-200 border border-surface-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div>
            <h2 className="font-serif font-bold text-gold text-base">Editar Despesa</h2>
            <p className="text-[11px] text-gold-muted mt-0.5">ID #{gasto.id}</p>
          </div>
          <button onClick={onFechar} className="p-1.5 text-gold-muted hover:text-gold transition-colors">
            <X size={18} />
          </button>
        </div>

        {erroSalvar && (
          <div className="mx-5 mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 text-xs">
            <AlertCircle size={14} className="shrink-0" /> {erroSalvar}
          </div>
        )}

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Unidade *</label>
              <select name="unidade" value={form.unidade} onChange={onChange} className="input-dark w-full">
                {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Categoria *</label>
              <select name="categoria" value={form.categoria} onChange={onChange} className="input-dark w-full">
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Descrição *</label>
            <input
              type="text" name="descricao" value={form.descricao} onChange={onChange} required
              className="input-dark w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Valor pago (R$) *</label>
              <input
                type="number" name="valor" value={form.valor} onChange={onChange} required
                min="0" step="0.01" className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Valor previsto (R$)</label>
              <input
                type="number" name="valor_previsto" value={form.valor_previsto} onChange={onChange}
                min="0" step="0.01" placeholder="0,00" className="input-dark w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Data *</label>
            <input type="date" name="data" value={form.data} onChange={onChange} required className="input-dark w-full" />
          </div>

          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Observação</label>
            <input
              type="text" name="observacao" value={form.observacao} onChange={onChange}
              placeholder="Detalhes adicionais…" className="input-dark w-full"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onFechar} className="flex-1 py-2.5 text-sm font-medium text-gold-muted border border-surface-border rounded-xl hover:text-gold transition-colors">
              Cancelar
            </button>
            <button
              type="submit" disabled={salvando}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando
                ? <span className="w-4 h-4 border-2 border-onix/30 border-t-onix rounded-full animate-spin" />
                : <Check size={15} />}
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function RegistroGasto() {
  const [form,     setForm]     = useState(FORM_INICIAL);
  const [gastos,   setGastos]   = useState([]);
  const [filtro,   setFiltro]   = useState(mesAtual());
  const [enviando, setEnviando] = useState(false);
  const [sucesso,  setSucesso]  = useState(null);
  const [erro,     setErro]     = useState(null);
  const [carregando, setCarregando] = useState(false);

  const [editandoGasto,    setEditandoGasto]    = useState(null);
  const [salvandoGasto,    setSalvandoGasto]    = useState(false);
  const [erroSalvarGasto,  setErroSalvarGasto]  = useState(null);
  const [sucessoGasto,     setSucessoGasto]     = useState(null);
  const [confirmandoDel,   setConfirmandoDel]   = useState(null);
  const [deletandoGasto,   setDeletandoGasto]   = useState(false);

  async function carregarGastos() {
    setCarregando(true);
    try {
      const rows = await api.gastos({ inicio: filtro.inicio, fim: filtro.fim });
      setGastos(rows);
    } catch { /* silencioso */ }
    finally { setCarregando(false); }
  }

  useEffect(() => {
    if (isValidDate(filtro.inicio) && isValidDate(filtro.fim)) carregarGastos();
  }, [filtro]); // eslint-disable-line react-hooks/exhaustive-deps

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    setSucesso(null);
    try {
      const payload = {
        unidade:    form.unidade,
        categoria:  form.categoria,
        descricao:  form.descricao.trim(),
        valor:      parseFloat(form.valor),
        data:       form.data,
        ...(form.observacao.trim()     ? { observacao:     form.observacao.trim() }     : {}),
        ...(form.valor_previsto        ? { valor_previsto: parseFloat(form.valor_previsto) } : {}),
      };
      const novo = await api.criarGasto(payload);
      setSucesso(novo);
      setForm((f) => ({ ...FORM_INICIAL, unidade: f.unidade, data: f.data }));
      carregarGastos();
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function salvarGasto(id, payload) {
    setSalvandoGasto(true);
    setErroSalvarGasto(null);
    try {
      const atualizado = await api.atualizarGasto(id, payload);
      setGastos(gs => gs.map(g => g.id === id ? { ...g, ...atualizado } : g));
      setSucessoGasto(id);
      setTimeout(() => setSucessoGasto(null), 2500);
      setEditandoGasto(null);
    } catch (err) {
      setErroSalvarGasto(err.message);
    } finally {
      setSalvandoGasto(false);
    }
  }

  async function deletarGasto(id) {
    setDeletandoGasto(true);
    try {
      await api.deletarGasto(id);
      setGastos(gs => gs.filter(g => g.id !== id));
      setConfirmandoDel(null);
    } catch { /* silencioso */ }
    finally { setDeletandoGasto(false); }
  }

  const totalMes = gastos.reduce((s, g) => s + parseFloat(g.valor), 0);

  return (
    <main className="max-w-2xl mx-auto px-4 pb-12 pt-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 mb-3">
          <Receipt size={22} className="text-red-400" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif font-bold text-xl text-gold">Registro de Despesas</h1>
        <p className="text-[11px] text-gold-muted uppercase tracking-widest mt-1">Lançamento de gastos operacionais</p>
      </div>

      {sucesso && (
        <div className="mb-5 p-4 rounded-xl bg-emerald-900/20 border border-emerald-700/40 text-emerald-400">
          <div className="flex items-center gap-2 font-semibold text-sm mb-1"><CheckCircle size={15} /> Despesa registrada!</div>
          <p className="text-xs text-emerald-300/70">{sucesso.descricao} — {fmt(sucesso.valor)}</p>
        </div>
      )}

      {erro && (
        <div className="mb-5 flex items-center gap-2 p-4 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 text-sm">
          <AlertCircle size={15} className="shrink-0" />{erro}
        </div>
      )}

      <form onSubmit={onSubmit} className="card-premium p-5 space-y-4 mb-8">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Unidade *</label>
            <select name="unidade" value={form.unidade} onChange={onChange} className="input-dark w-full">
              {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Categoria *</label>
            <select name="categoria" value={form.categoria} onChange={onChange} className="input-dark w-full">
              {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Descrição *</label>
          <input
            type="text" name="descricao" value={form.descricao} onChange={onChange} required
            placeholder="Ex.: Aluguel outubro, Produtos Barber…" className="input-dark w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Valor pago (R$) *</label>
            <input
              type="number" name="valor" value={form.valor} onChange={onChange} required
              min="0" step="0.01" placeholder="0,00" className="input-dark w-full"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">
              Valor previsto (R$) <span className="normal-case text-gold-muted/50">(opcional)</span>
            </label>
            <input
              type="number" name="valor_previsto" value={form.valor_previsto} onChange={onChange}
              min="0" step="0.01" placeholder="0,00" className="input-dark w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Data *</label>
          <input type="date" name="data" value={form.data} onChange={onChange} required className="input-dark w-full" />
        </div>

        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">
            Observação <span className="normal-case text-gold-muted/50">(opcional)</span>
          </label>
          <input
            type="text" name="observacao" value={form.observacao} onChange={onChange}
            placeholder="Detalhes adicionais…" className="input-dark w-full"
          />
        </div>

        <button
          type="submit" disabled={enviando}
          className="btn-gold w-full justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {enviando
            ? <span className="w-4 h-4 border-2 border-onix/30 border-t-onix rounded-full animate-spin" />
            : <Plus size={15} />}
          {enviando ? 'Registrando…' : 'Registrar Despesa'}
        </button>
      </form>

      {/* Lista de despesas do período */}
      <div className="card-premium p-5">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-sm font-semibold text-gold-light">Despesas do período</h2>
          <div className="flex items-center gap-2">
            <input type="date" value={filtro.inicio} onChange={(e) => setFiltro((f) => ({ ...f, inicio: e.target.value }))} className="input-dark text-xs px-2 py-1 flex-1 sm:flex-initial" />
            <span className="text-gold-muted text-xs">até</span>
            <input type="date" value={filtro.fim} onChange={(e) => setFiltro((f) => ({ ...f, fim: e.target.value }))} className="input-dark text-xs px-2 py-1 flex-1 sm:flex-initial" />
          </div>
        </div>

        <div className="mb-3 flex justify-between text-xs">
          <span className="text-gold-muted">{gastos.length} lançamento(s)</span>
          <span className="text-red-400 font-semibold">{fmt(totalMes)}</span>
        </div>

        {carregando ? (
          <div className="flex justify-center py-6">
            <span className="w-5 h-5 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
          </div>
        ) : gastos.length === 0 ? (
          <p className="text-center text-gold-muted/50 text-sm py-6">Nenhuma despesa no período.</p>
        ) : (
          <div className="space-y-1">
            {gastos.map((g) => {
              const foiEditado = sucessoGasto === g.id;
              return (
                <div
                  key={g.id}
                  className={`flex items-center gap-3 py-2 border-b border-surface-border last:border-0 transition-colors ${foiEditado ? 'bg-emerald-900/10' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gold-light truncate">{g.descricao}</p>
                    <p className="text-[11px] text-gold-muted">{g.categoria} · {String(g.data).slice(0, 10)} · {g.unidade}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-red-400">{fmt(g.valor)}</p>
                    {g.valor_previsto && (
                      <p className="text-[11px] text-gold-muted">prev. {fmt(g.valor_previsto)}</p>
                    )}
                  </div>
                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    {confirmandoDel === g.id ? (
                      <>
                        <button
                          onClick={() => setConfirmandoDel(null)}
                          className="px-2 py-1 text-[11px] font-medium text-gold-muted border border-surface-border rounded-lg hover:text-gold transition-colors"
                        >
                          Não
                        </button>
                        <button
                          onClick={() => deletarGasto(g.id)}
                          disabled={deletandoGasto}
                          className="px-2 py-1 text-[11px] font-medium text-red-400 border border-red-700/40 rounded-lg hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                          Excluir
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditandoGasto(g); setErroSalvarGasto(null); }}
                          className="p-1.5 text-gold-muted hover:text-gold transition-colors"
                          title="Editar despesa"
                        >
                          {foiEditado ? <Check size={15} className="text-emerald-400" /> : <Pencil size={15} />}
                        </button>
                        <button
                          onClick={() => setConfirmandoDel(g.id)}
                          className="p-1.5 text-gold-muted hover:text-red-400 transition-colors"
                          title="Excluir despesa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal edição */}
      {editandoGasto && (
        <ModalEditarGasto
          gasto={editandoGasto}
          onSalvar={salvarGasto}
          onFechar={() => { setEditandoGasto(null); setErroSalvarGasto(null); }}
          salvando={salvandoGasto}
          erroSalvar={erroSalvarGasto}
        />
      )}
    </main>
  );
}
