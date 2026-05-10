import { useState, useEffect } from 'react';
import { Tag, Plus, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

const UNIDADES = [
  { value: 'tambore', label: 'Tamboré' },
  { value: 'mutinga', label: 'Mutinga' },
];

function hojeISO() { return new Date().toISOString().slice(0, 10); }
function addDias(d, n) {
  const dt = new Date(d + 'T00:00:00');
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

const FORM_INICIAL = {
  cliente_nome:    '',
  cliente_contato: '',
  profissional_id: '',
  unidade:         'tambore',
  data_aquisicao:  hojeISO(),
  data_vencimento: addDias(hojeISO(), 30),
  servicos:        '',
  valor:           '',
};

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

export default function Combos() {
  const [combos,     setCombos]     = useState([]);
  const [barbeiros,  setBarbeiros]  = useState([]);
  const [abaAtiva,   setAbaAtiva]   = useState('lista');
  const [loading,    setLoading]    = useState(false);
  const [form,       setForm]       = useState(FORM_INICIAL);
  const [enviando,   setEnviando]   = useState(false);
  const [sucesso,    setSucesso]    = useState(null);
  const [erro,       setErro]       = useState(null);
  const [apenasVenc, setApenasVenc] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const [rows, profs] = await Promise.all([
        api.combos({ apenas_vencidos: apenasVenc ? 'true' : undefined }),
        api.profissionais({ apenas_barbeiros: 'true' }),
      ]);
      setCombos(rows);
      setBarbeiros(profs);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, [apenasVenc]);

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
        ...form,
        profissional_id: form.profissional_id ? parseInt(form.profissional_id) : undefined,
        valor: parseFloat(form.valor),
      };
      const novo = await api.criarCombo(payload);
      setSucesso(novo);
      setForm(FORM_INICIAL);
      carregar();
      setAbaAtiva('lista');
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function renovar(id, dataAtual) {
    const nova = addDias(dataAtual, 30);
    await api.atualizarCombo(id, { data_vencimento: nova });
    carregar();
  }

  async function desativar(id) {
    await api.atualizarCombo(id, { ativo: false });
    carregar();
  }

  const hoje = hojeISO();
  const vencidos = combos.filter((c) => c.data_vencimento < hoje);

  return (
    <main className="max-w-3xl mx-auto px-4 pb-12 pt-6 animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 mb-3">
          <Tag size={22} className="text-purple-400" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif font-bold text-xl text-gold">Gestão de Combos</h1>
        {vencidos.length > 0 && (
          <p className="mt-1 text-xs text-amber-400 font-medium">
            {vencidos.length} combo(s) vencido(s) — ação necessária
          </p>
        )}
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 border-b border-surface-border">
        {['lista', 'novo'].map((a) => (
          <button
            key={a}
            onClick={() => setAbaAtiva(a)}
            className={`px-4 py-2.5 text-xs font-semibold capitalize border-b-2 transition-all -mb-px
              ${abaAtiva === a ? 'border-gold text-gold' : 'border-transparent text-gold-muted hover:text-gold-light'}`}
          >
            {a === 'lista' ? 'Combos ativos' : 'Novo combo'}
          </button>
        ))}
      </div>

      {abaAtiva === 'novo' && (
        <form onSubmit={onSubmit} className="card-premium p-5 space-y-4">
          {sucesso && (
            <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-700/40 text-emerald-400 flex items-center gap-2 text-sm">
              <CheckCircle size={14} /> Combo registrado!
            </div>
          )}
          {erro && (
            <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/40 text-red-400 flex items-center gap-2 text-sm">
              <AlertTriangle size={14} /> {erro}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Nome do cliente *</label>
              <input type="text" name="cliente_nome" value={form.cliente_nome} onChange={onChange} required className="input-dark w-full" placeholder="Nome completo" />
            </div>
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Contato</label>
              <input type="text" name="cliente_contato" value={form.cliente_contato} onChange={onChange} className="input-dark w-full" placeholder="WhatsApp…" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Unidade *</label>
              <select name="unidade" value={form.unidade} onChange={onChange} className="input-dark w-full">
                {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Barbeiro</label>
              <select name="profissional_id" value={form.profissional_id} onChange={onChange} className="input-dark w-full">
                <option value="">Qualquer barbeiro</option>
                {barbeiros.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Serviços incluídos *</label>
            <input type="text" name="servicos" value={form.servicos} onChange={onChange} required className="input-dark w-full" placeholder="Ex.: 4 cortes + 2 barbas" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Valor (R$) *</label>
              <input type="number" name="valor" value={form.valor} onChange={onChange} required min="0" step="0.01" placeholder="0,00" className="input-dark w-full" />
            </div>
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Aquisição *</label>
              <input type="date" name="data_aquisicao" value={form.data_aquisicao} onChange={onChange} required className="input-dark w-full" />
            </div>
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Vencimento *</label>
              <input type="date" name="data_vencimento" value={form.data_vencimento} onChange={onChange} required className="input-dark w-full" />
            </div>
          </div>

          <button type="submit" disabled={enviando} className="btn-gold w-full justify-center py-2.5 disabled:opacity-50">
            {enviando ? <span className="w-4 h-4 border-2 border-onix/30 border-t-onix rounded-full animate-spin" /> : <Plus size={15} />}
            {enviando ? 'Salvando…' : 'Registrar Combo'}
          </button>
        </form>
      )}

      {abaAtiva === 'lista' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 text-xs text-gold-muted cursor-pointer">
              <input type="checkbox" checked={apenasVenc} onChange={(e) => setApenasVenc(e.target.checked)} className="accent-gold" />
              Apenas vencidos
            </label>
            <button onClick={carregar} className="flex items-center gap-1.5 text-xs text-gold-muted hover:text-gold transition-colors">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <span className="w-5 h-5 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
            </div>
          ) : combos.length === 0 ? (
            <p className="text-center text-gold-muted/50 text-sm py-12">Nenhum combo encontrado.</p>
          ) : (
            <div className="space-y-3">
              {combos.map((c) => {
                const vencido = c.data_vencimento < hoje;
                return (
                  <div key={c.id} className={`card-premium p-4 border ${vencido ? 'border-amber-500/30' : 'border-surface-border'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gold-light">{c.cliente_nome}</p>
                          {vencido && <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Vencido</span>}
                        </div>
                        <p className="text-xs text-gold-muted mt-0.5">{c.servicos}</p>
                        <p className="text-[11px] text-gold-muted/60 mt-1">
                          {c.profissional_nome ?? 'Qualquer barbeiro'} · {c.unidade} · {c.data_aquisicao} → {c.data_vencimento}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gold shrink-0">{fmt(c.valor)}</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => renovar(c.id, c.data_vencimento)}
                        className="text-xs px-3 py-1 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        Renovar +30d
                      </button>
                      <button
                        onClick={() => desativar(c.id)}
                        className="text-xs px-3 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Desativar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}
