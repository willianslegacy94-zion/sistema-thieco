import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';

const UNIDADES = [
  { value: '',        label: 'Todas' },
  { value: 'tambore', label: 'Tamboré' },
  { value: 'mutinga', label: 'Mutinga' },
];

const TIPOS = [
  { value: 'regular', label: 'Regular' },
  { value: 'vip',     label: 'VIP' },
  { value: 'combo',   label: 'Combo' },
];

function hojeISO() { return new Date().toISOString().slice(0, 10); }

const FORM_INICIAL = {
  nome:                  '',
  contato:               '',
  tipo:                  'regular',
  barbeiro_preferido_id: '',
  unidade:               'tambore',
  primeira_visita:       hojeISO(),
  observacao:            '',
};

export default function Clientes() {
  const [clientes,  setClientes]  = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [form,      setForm]      = useState(FORM_INICIAL);
  const [busca,     setBusca]     = useState('');
  const [unidade,   setUnidade]   = useState('');
  const [abaAtiva,  setAbaAtiva]  = useState('lista');
  const [loading,   setLoading]   = useState(false);
  const [enviando,  setEnviando]  = useState(false);
  const [sucesso,   setSucesso]   = useState(null);
  const [erro,      setErro]      = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, profs] = await Promise.all([
        api.clientes({ ...(busca ? { busca } : {}), ...(unidade ? { unidade } : {}) }),
        api.profissionais({ apenas_barbeiros: 'true' }),
      ]);
      setClientes(rows);
      setBarbeiros(profs);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [busca, unidade]);

  useEffect(() => { carregar(); }, [unidade]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function pesquisar(e) {
    e.preventDefault();
    carregar();
  }

  async function onSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    setSucesso(null);
    try {
      const payload = {
        ...form,
        barbeiro_preferido_id: form.barbeiro_preferido_id ? parseInt(form.barbeiro_preferido_id) : undefined,
      };
      const novo = await api.criarCliente(payload);
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

  const badgeClasse = (tipo) => ({
    regular: 'text-gold-muted bg-gold/10 border-gold/20',
    vip:     'text-yellow-300 bg-yellow-500/10 border-yellow-500/20',
    combo:   'text-purple-300 bg-purple-500/10 border-purple-500/20',
  }[tipo] ?? '');

  return (
    <main className="max-w-3xl mx-auto px-4 pb-12 pt-6 animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 mb-3">
          <Users size={22} className="text-blue-400" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif font-bold text-xl text-gold">Base de Clientes</h1>
        <p className="text-[11px] text-gold-muted uppercase tracking-widest mt-1">{clientes.length} cliente(s) cadastrado(s)</p>
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
            {a === 'lista' ? 'Clientes' : 'Novo cliente'}
          </button>
        ))}
      </div>

      {abaAtiva === 'novo' && (
        <form onSubmit={onSubmit} className="card-premium p-5 space-y-4">
          {sucesso && (
            <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-700/40 text-emerald-400 flex items-center gap-2 text-sm">
              <CheckCircle size={14} /> Cliente cadastrado!
            </div>
          )}
          {erro && (
            <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/40 text-red-400 flex items-center gap-2 text-sm">
              <AlertTriangle size={14} /> {erro}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Nome *</label>
              <input type="text" name="nome" value={form.nome} onChange={onChange} required className="input-dark w-full" placeholder="Nome do cliente" />
            </div>
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Contato</label>
              <input type="text" name="contato" value={form.contato} onChange={onChange} className="input-dark w-full" placeholder="WhatsApp…" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Tipo</label>
              <select name="tipo" value={form.tipo} onChange={onChange} className="input-dark w-full">
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Unidade</label>
              <select name="unidade" value={form.unidade} onChange={onChange} className="input-dark w-full">
                {UNIDADES.filter((u) => u.value).map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Barbeiro preferido</label>
              <select name="barbeiro_preferido_id" value={form.barbeiro_preferido_id} onChange={onChange} className="input-dark w-full">
                <option value="">Sem preferência</option>
                {barbeiros.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Primeira visita</label>
              <input type="date" name="primeira_visita" value={form.primeira_visita} onChange={onChange} className="input-dark w-full" />
            </div>
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Observação</label>
              <input type="text" name="observacao" value={form.observacao} onChange={onChange} className="input-dark w-full" placeholder="Preferências…" />
            </div>
          </div>

          <button type="submit" disabled={enviando} className="btn-gold w-full justify-center py-2.5 disabled:opacity-50">
            {enviando ? <span className="w-4 h-4 border-2 border-onix/30 border-t-onix rounded-full animate-spin" /> : <Plus size={15} />}
            {enviando ? 'Salvando…' : 'Cadastrar Cliente'}
          </button>
        </form>
      )}

      {abaAtiva === 'lista' && (
        <>
          <div className="card-premium p-4 mb-4 flex flex-wrap items-center gap-3">
            <form onSubmit={pesquisar} className="flex items-center gap-2 flex-1">
              <Search size={14} className="text-gold-muted shrink-0" />
              <input
                type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome…" className="input-dark flex-1 text-sm"
              />
              <button type="submit" className="px-3 py-1.5 text-xs font-medium text-gold-muted hover:text-gold border border-surface-border rounded-lg transition-colors">
                Buscar
              </button>
            </form>
            <select value={unidade} onChange={(e) => setUnidade(e.target.value)} className="input-dark text-xs px-2 py-1.5">
              {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <span className="w-5 h-5 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
            </div>
          ) : clientes.length === 0 ? (
            <p className="text-center text-gold-muted/50 text-sm py-12">Nenhum cliente encontrado.</p>
          ) : (
            <div className="space-y-2">
              {clientes.map((c) => (
                <div key={c.id} className="card-premium p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gold-light">{c.nome}</p>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${badgeClasse(c.tipo)}`}>
                        {c.tipo}
                      </span>
                    </div>
                    <p className="text-[11px] text-gold-muted mt-0.5">
                      {c.contato ?? '—'} · {c.unidade ?? '—'} · {c.barbeiro_preferido_nome ?? 'Sem barbeiro preferido'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gold-muted">{c.total_visitas} visita(s)</p>
                    {c.ultima_visita && <p className="text-[11px] text-gold-muted/60">última: {c.ultima_visita}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
