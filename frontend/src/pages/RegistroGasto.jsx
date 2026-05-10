import { useState, useEffect } from 'react';
import { Receipt, CheckCircle, AlertCircle, Plus } from 'lucide-react';
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

export default function RegistroGasto() {
  const [form,     setForm]     = useState(FORM_INICIAL);
  const [gastos,   setGastos]   = useState([]);
  const [filtro,   setFiltro]   = useState(mesAtual());
  const [enviando, setEnviando] = useState(false);
  const [sucesso,  setSucesso]  = useState(null);
  const [erro,     setErro]     = useState(null);
  const [carregando, setCarregando] = useState(false);

  async function carregarGastos() {
    setCarregando(true);
    try {
      const rows = await api.gastos({ inicio: filtro.inicio, fim: filtro.fim });
      setGastos(rows);
    } catch { /* silencioso */ }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregarGastos(); }, [filtro]);

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

      {/* Lista de despesas do mês */}
      <div className="card-premium p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gold-light">Despesas do período</h2>
          <div className="flex items-center gap-2">
            <input type="date" value={filtro.inicio} onChange={(e) => setFiltro((f) => ({ ...f, inicio: e.target.value }))} className="input-dark text-xs px-2 py-1" />
            <span className="text-gold-muted text-xs">até</span>
            <input type="date" value={filtro.fim} onChange={(e) => setFiltro((f) => ({ ...f, fim: e.target.value }))} className="input-dark text-xs px-2 py-1" />
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
          <div className="space-y-2">
            {gastos.map((g) => (
              <div key={g.id} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                <div>
                  <p className="text-sm text-gold-light">{g.descricao}</p>
                  <p className="text-[11px] text-gold-muted">{g.categoria} · {g.data} · {g.unidade}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-400">{fmt(g.valor)}</p>
                  {g.valor_previsto && (
                    <p className="text-[11px] text-gold-muted">prev. {fmt(g.valor_previsto)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
