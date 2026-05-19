import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, CheckCircle, AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

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
  unidade:               'tambore',
  barbeiro_preferido_id: '',
  data_nascimento:       '',
  primeira_visita:       hojeISO(),
  observacao:            '',
};

function ModalExcluir({ cliente, onConfirmar, onFechar, excluindo, erro }) {
  const [observacao, setObservacao] = useState('');

  function onSubmit(e) {
    e.preventDefault();
    if (!observacao.trim()) return;
    onConfirmar(cliente.id, observacao.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-onix-200 border border-surface-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div>
            <h2 className="font-serif font-bold text-red-400 text-base">Excluir Cliente</h2>
            <p className="text-[11px] text-gold-muted mt-0.5">{cliente.nome}</p>
          </div>
          <button onClick={onFechar} className="p-1.5 text-gold-muted hover:text-gold transition-colors">
            <X size={18} />
          </button>
        </div>

        {erro && (
          <div className="mx-5 mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 text-xs">
            <AlertCircle size={14} className="shrink-0" /> {erro}
          </div>
        )}

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <p className="text-sm text-gold-muted">
            Esta ação desativará o cliente da base. Informe o motivo abaixo.
          </p>
          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">
              Motivo da exclusão *
            </label>
            <input
              type="text"
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              required
              autoFocus
              placeholder="Ex.: Cliente de teste, dados duplicados…"
              className="input-dark w-full"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onFechar}
              className="flex-1 py-2.5 text-sm font-medium text-gold-muted border border-surface-border rounded-xl hover:text-gold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={excluindo || !observacao.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {excluindo
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Trash2 size={15} />}
              {excluindo ? 'Excluindo…' : 'Confirmar Exclusão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Clientes() {
  const { isAdmin } = useAuth();

  const [clientes,          setClientes]          = useState([]);
  const [barbeiros,         setBarbeiros]         = useState([]);
  const [form,              setForm]              = useState(FORM_INICIAL);
  const [busca,             setBusca]             = useState('');
  const [unidade,           setUnidade]           = useState('');
  const [filtroBarbeiro,    setFiltroBarbeiro]    = useState('');
  const [abaAtiva,          setAbaAtiva]          = useState('lista');
  const [loading,           setLoading]           = useState(false);
  const [enviando,          setEnviando]          = useState(false);
  const [sucesso,           setSucesso]           = useState(null);
  const [erro,              setErro]              = useState(null);
  const [clienteParaExcluir, setClienteParaExcluir] = useState(null);
  const [excluindo,          setExcluindo]          = useState(false);
  const [erroExclusao,       setErroExclusao]       = useState(null);

  useEffect(() => {
    api.profissionais().then(setBarbeiros).catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (busca)          params.busca                   = busca;
      if (unidade)        params.unidade                 = unidade;
      if (filtroBarbeiro) params.barbeiro_responsavel_id = filtroBarbeiro;

      const rows = await api.clientes(params);
      setClientes(rows);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [busca, unidade, filtroBarbeiro]);

  useEffect(() => { carregar(); }, [unidade, filtroBarbeiro]);

  // Cascata do formulário: barbeiros da unidade selecionada no form
  const barbeirosParaForm = form.unidade
    ? barbeiros.filter((b) => b.unidade === form.unidade)
    : barbeiros;

  // Cascata da listagem: barbeiros da unidade selecionada no filtro
  const barbeirosParaFiltro = unidade
    ? barbeiros.filter((b) => b.unidade === unidade)
    : barbeiros;

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };
      if (name === 'unidade') next.barbeiro_preferido_id = '';
      return next;
    });
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
      const barbeiroId = form.barbeiro_preferido_id ? parseInt(form.barbeiro_preferido_id) : undefined;
      const payload = {
        ...form,
        barbeiro_preferido_id:   barbeiroId,
        barbeiro_responsavel_id: barbeiroId,
        data_nascimento:         form.data_nascimento || undefined,
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

  async function excluirCliente(id, observacao) {
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await api.deletarCliente(id, observacao);
      setClientes(cs => cs.filter(c => c.id !== id));
      setClienteParaExcluir(null);
    } catch (err) {
      setErroExclusao(err.message);
    } finally {
      setExcluindo(false);
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

          {/* Linha 1: Nome e Contato */}
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

          {/* Linha 2: Tipo, Unidade e Data de Nascimento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Data de Nascimento</label>
              <input type="date" name="data_nascimento" value={form.data_nascimento} onChange={onChange} className="input-dark w-full" />
            </div>
          </div>

          {/* Linha 3: Barbeiro — cascata pela unidade selecionada */}
          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Barbeiro</label>
            <select name="barbeiro_preferido_id" value={form.barbeiro_preferido_id} onChange={onChange} className="input-dark w-full">
              <option value="">Sem barbeiro</option>
              {barbeirosParaForm.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </div>

          {/* Linha 4: Primeira Visita e Observação */}
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
            <select
              value={unidade}
              onChange={(e) => { setUnidade(e.target.value); setFiltroBarbeiro(''); }}
              className="input-dark text-xs px-2 py-1.5"
            >
              {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
            <select value={filtroBarbeiro} onChange={(e) => setFiltroBarbeiro(e.target.value)} className="input-dark text-xs px-2 py-1.5">
              <option value="">Todos barbeiros</option>
              {barbeirosParaFiltro.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gold-light">{c.nome}</p>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${badgeClasse(c.tipo)}`}>
                        {c.tipo}
                      </span>
                    </div>
                    <p className="text-[11px] text-gold-muted mt-0.5">
                      {c.contato ?? '—'} · {c.unidade ?? '—'} · pref: {c.barbeiro_preferido_nome ?? '—'}
                    </p>
                    <p className="text-[11px] text-gold-muted/70 mt-0.5">
                      Responsável: {c.barbeiro_responsavel_nome ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gold-muted">{c.total_visitas} visita(s)</p>
                      {c.ultima_visita && <p className="text-[11px] text-gold-muted/60">última: {c.ultima_visita}</p>}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => { setClienteParaExcluir(c); setErroExclusao(null); }}
                        className="p-1.5 text-gold-muted hover:text-red-400 transition-colors"
                        title="Excluir cliente"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {clienteParaExcluir && (
        <ModalExcluir
          cliente={clienteParaExcluir}
          onConfirmar={excluirCliente}
          onFechar={() => { setClienteParaExcluir(null); setErroExclusao(null); }}
          excluindo={excluindo}
          erro={erroExclusao}
        />
      )}
    </main>
  );
}
