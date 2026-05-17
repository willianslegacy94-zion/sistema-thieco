import { useState, useEffect } from 'react';
import { Pencil, Trash2, X, Check, AlertCircle, RefreshCw, ClipboardList } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const FORMAS_PAGAMENTO = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix',      label: 'Pix'      },
  { value: 'credito',  label: 'Crédito'  },
  { value: 'debito',   label: 'Débito'   },
  { value: 'cortesia', label: 'Cortesia' },
];

const TIPOS_CLIENTE = [
  { value: 'agendado',     label: 'Agendado'      },
  { value: 'primeira_vez', label: 'Primeira vez'  },
  { value: 'esporadico',   label: 'Esporádico'    },
];

const BADGE_PGTO = {
  dinheiro: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/30',
  pix:      'bg-blue-900/30 text-blue-400 border-blue-700/30',
  credito:  'bg-purple-900/30 text-purple-400 border-purple-700/30',
  debito:   'bg-amber-900/30 text-amber-400 border-amber-700/30',
  cortesia: 'bg-rose-900/30 text-rose-400 border-rose-700/30',
};

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isValidDate(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  if (parseInt(s, 10) < 2000) return false;
  const d = new Date(s + 'T00:00:00');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// ─── Modal de Edição ──────────────────────────────────────────────────────────

const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Outra'];

function ModalEditar({ venda, barbeiros, onSalvar, onFechar, salvando, erroSalvar }) {
  const [erroData, setErroData] = useState(null);
  const [form, setForm] = useState({
    profissional_id: venda.profissional_id ?? '',
    servico:         venda.servico ?? '',
    valor:           parseFloat(venda.valor).toFixed(2),
    forma_pagamento: venda.forma_pagamento ?? 'dinheiro',
    desconto:        venda.desconto ? parseFloat(venda.desconto).toFixed(2) : '',
    tipo_cliente:    venda.tipo_cliente ?? 'agendado',
    qtd_clientes:    venda.qtd_clientes ?? 1,
    data:            venda.data ? String(venda.data).slice(0, 10) : hojeISO(),
    observacao:      venda.observacao ?? '',
    bandeira_cartao: venda.bandeira_cartao ?? '',
    nome_cliente:    venda.nome_cliente ?? '',
  });

  function onChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!isValidDate(form.data)) {
      setErroData('Data inválida. Verifique se o ano está completo (ex: 2026).');
      return;
    }
    setErroData(null);
    const payload = {
      profissional_id: form.profissional_id ? parseInt(form.profissional_id) : null,
      servico:         form.servico.trim(),
      valor:           parseFloat(form.valor),
      forma_pagamento: form.forma_pagamento,
      desconto:        form.desconto !== '' ? parseFloat(form.desconto) : 0,
      tipo_cliente:    form.tipo_cliente,
      qtd_clientes:    parseInt(form.qtd_clientes) || 1,
      data:            form.data,
      observacao:      form.observacao.trim() || null,
      bandeira_cartao: form.bandeira_cartao || null,
      nome_cliente:    form.nome_cliente.trim() || null,
    };
    onSalvar(venda.id, payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-onix-200 border border-surface-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div>
            <h2 className="font-serif font-bold text-gold text-base">Editar Lançamento</h2>
            <p className="text-[11px] text-gold-muted mt-0.5">ID #{venda.id}</p>
          </div>
          <button onClick={onFechar} className="p-1.5 text-gold-muted hover:text-gold transition-colors">
            <X size={18} />
          </button>
        </div>

        {(erroSalvar || erroData) && (
          <div className="mx-5 mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 text-xs">
            <AlertCircle size={14} className="shrink-0" /> {erroData ?? erroSalvar}
          </div>
        )}

        <form onSubmit={onSubmit} className="p-5 space-y-4">

          {/* Barbeiro */}
          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Barbeiro</label>
            <select name="profissional_id" value={form.profissional_id} onChange={onChange} className="input-dark w-full">
              <option value="">Sem barbeiro</option>
              {barbeiros.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </div>

          {/* Serviço */}
          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Serviço / Produto *</label>
            <input
              type="text" name="servico" value={form.servico} onChange={onChange} required
              className="input-dark w-full" placeholder="Ex.: Corte"
            />
          </div>

          {/* Valor + Pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Valor (R$) *</label>
              <input
                type="number" name="valor" value={form.valor} onChange={onChange} required
                min="0" step="0.01" className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Pagamento *</label>
              <select name="forma_pagamento" value={form.forma_pagamento} onChange={onChange} className="input-dark w-full">
                {FORMAS_PAGAMENTO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {/* Nome do cliente */}
          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">
              Nome do cliente <span className="normal-case text-gold-muted/50">(opcional)</span>
            </label>
            <input
              type="text" name="nome_cliente" value={form.nome_cliente} onChange={onChange}
              placeholder="Ex.: João Silva" className="input-dark w-full"
            />
          </div>

          {/* Bandeira do cartão (visível apenas para crédito/débito) */}
          {(form.forma_pagamento === 'credito' || form.forma_pagamento === 'debito') && (
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">
                Bandeira <span className="normal-case text-gold-muted/50">(opcional)</span>
              </label>
              <select name="bandeira_cartao" value={form.bandeira_cartao} onChange={onChange} className="input-dark w-full">
                <option value="">Selecione a bandeira</option>
                {BANDEIRAS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}

          {/* Desconto + Qtd */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Desconto (R$)</label>
              <input
                type="number" name="desconto" value={form.desconto} onChange={onChange}
                min="0" step="0.01" placeholder="0,00" className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Qtd. Clientes</label>
              <input
                type="number" name="qtd_clientes" value={form.qtd_clientes} onChange={onChange}
                min="1" step="1" className="input-dark w-full"
              />
            </div>
          </div>

          {/* Tipo cliente + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Origem</label>
              <select name="tipo_cliente" value={form.tipo_cliente} onChange={onChange} className="input-dark w-full">
                {TIPOS_CLIENTE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Data *</label>
              <input type="date" name="data" value={form.data} onChange={onChange} required className="input-dark w-full" />
            </div>
          </div>

          {/* Observação */}
          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Observação</label>
            <input
              type="text" name="observacao" value={form.observacao} onChange={onChange}
              placeholder="Observações…" className="input-dark w-full"
            />
          </div>

          {/* Ações */}
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

export default function Lancamentos() {
  const { user, isAdmin } = useAuth();

  const [filtros, setFiltros] = useState({ inicio: hojeISO(), fim: hojeISO() });
  const [vendas,     setVendas]     = useState([]);
  const [vendasHoje, setVendasHoje] = useState([]);
  const [barbeiros,  setBarbeiros]  = useState([]);
  const [loading,    setLoading]    = useState(false);

  const [editando,          setEditando]          = useState(null);
  const [salvando,          setSalvando]          = useState(false);
  const [erroSalvar,        setErroSalvar]        = useState(null);
  const [sucesso,           setSucesso]           = useState(null);
  const [confirmandoDelete, setConfirmandoDelete] = useState(null);
  const [deletando,         setDeletando]         = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const params = { ...filtros };
      if (!isAdmin && user?.unidade) params.unidade = user.unidade;
      const data = await api.vendas(params);
      setVendas(Array.isArray(data) ? data : []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }

  async function carregarHoje() {
    try {
      const params = { inicio: hojeISO(), fim: hojeISO() };
      if (!isAdmin && user?.unidade) params.unidade = user.unidade;
      const data = await api.vendas(params);
      setVendasHoje(Array.isArray(data) ? data : []);
    } catch { /* silencioso */ }
  }

  useEffect(() => {
    carregar();
    carregarHoje();
    api.profissionais({ apenas_barbeiros: 'true' }).then(setBarbeiros).catch(() => {});
  }, []);

  async function salvar(id, payload) {
    setSalvando(true);
    setErroSalvar(null);
    try {
      const atualizado = await api.atualizarVenda(id, payload);
      setVendas(vs => vs.map(v => v.id === id ? { ...v, ...atualizado } : v));
      setVendasHoje(vs => vs.map(v => v.id === id ? { ...v, ...atualizado } : v));
      setSucesso(id);
      setTimeout(() => setSucesso(null), 2500);
      setEditando(null);
    } catch (err) {
      setErroSalvar(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function deletar(id) {
    setDeletando(true);
    try {
      await api.deletarVenda(id);
      setVendas(vs => vs.filter(v => v.id !== id));
      setVendasHoje(vs => vs.filter(v => v.id !== id));
      setConfirmandoDelete(null);
    } catch { /* silencioso */ }
    finally { setDeletando(false); }
  }

  const total     = vendas.reduce((s, v) => s + parseFloat(v.valor ?? 0) - parseFloat(v.desconto ?? 0), 0);
  const totalHoje = vendasHoje.reduce((s, v) => s + parseFloat(v.valor ?? 0) - parseFloat(v.desconto ?? 0), 0);

  return (
    <main className="max-w-2xl mx-auto px-4 pb-12 pt-6 animate-fade-in">

      {/* Cabeçalho */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 border border-gold-dark/40 mb-3">
          <ClipboardList size={22} className="text-gold" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif font-bold text-xl text-gold">Lançamentos</h1>
        <p className="text-[11px] text-gold-muted uppercase tracking-widest mt-1">
          {isAdmin ? 'Todas as unidades' : `Unidade ${user?.unidade ?? ''}`}
        </p>
      </div>

      {/* Resumo de hoje — sempre visível */}
      <div className="card-premium p-4 mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] text-gold-muted uppercase tracking-widest font-semibold">Hoje</p>
          <p className="text-xs text-gold-muted mt-0.5">{vendasHoje.length} lançamento(s)</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gold">{fmt(totalHoje)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card-premium p-4 mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <input
            type="date" value={filtros.inicio}
            onChange={e => setFiltros(f => ({ ...f, inicio: e.target.value }))}
            className="input-dark text-xs px-2 py-1 flex-1"
          />
          <span className="text-gold-muted text-xs shrink-0">até</span>
          <input
            type="date" value={filtros.fim}
            onChange={e => setFiltros(f => ({ ...f, fim: e.target.value }))}
            className="input-dark text-xs px-2 py-1 flex-1"
          />
        </div>
        <button
          onClick={carregar} disabled={loading}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gold-muted hover:text-gold border border-surface-border rounded-lg transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Resumo */}
      {vendas.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 mb-4 rounded-xl bg-gold/5 border border-gold-dark/20">
          <span className="text-xs text-gold-muted">{vendas.length} lançamento(s)</span>
          <span className="text-sm font-bold text-gold">{fmt(total)}</span>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <span className="w-6 h-6 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
        </div>
      )}

      {!loading && vendas.length === 0 && (
        <div className="text-center py-12 text-gold-muted text-sm">
          Nenhum lançamento encontrado no período.
        </div>
      )}

      {/* Lista de vendas */}
      {!loading && vendas.length > 0 && (
        <div className="space-y-2">
          {vendas.map(v => {
            const valorLiq = parseFloat(v.valor ?? 0) - parseFloat(v.desconto ?? 0);
            const foiEditado = sucesso === v.id;
            return (
              <div
                key={v.id}
                className={`card-premium px-4 py-3 flex items-center gap-3 transition-all ${foiEditado ? 'border-emerald-700/50 bg-emerald-900/10' : ''}`}
              >
                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gold-light truncate">{v.servico}</span>
                    {v.upsell && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-700/30">upsell</span>
                    )}
                  </div>
                  {v.nome_cliente && (
                    <p className="text-[10px] text-gold-muted/70 mt-0.5">{v.nome_cliente}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gold-muted">{String(v.data).slice(0, 10)}</span>
                    {v.profissional_nome && (
                      <span className="text-xs text-gold-muted">· {v.profissional_nome}</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${BADGE_PGTO[v.forma_pagamento] ?? 'bg-surface-border/30 text-gold-muted border-surface-border'}`}>
                      {FORMAS_PAGAMENTO.find(f => f.value === v.forma_pagamento)?.label ?? v.forma_pagamento}
                      {v.bandeira_cartao ? ` · ${v.bandeira_cartao}` : ''}
                    </span>
                    {isAdmin && (
                      <span className="text-[10px] text-gold-muted/50 capitalize">{v.unidade}</span>
                    )}
                  </div>
                </div>

                {/* Valor */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gold">{fmt(valorLiq)}</p>
                  {parseFloat(v.desconto ?? 0) > 0 && (
                    <p className="text-[10px] text-gold-muted line-through">{fmt(v.valor)}</p>
                  )}
                </div>

                {/* Botões de ação */}
                <div className="flex items-center gap-1 shrink-0">
                  {isAdmin && confirmandoDelete === v.id ? (
                    <>
                      <button
                        onClick={() => setConfirmandoDelete(null)}
                        className="px-2 py-1 text-[11px] font-medium text-gold-muted border border-surface-border rounded-lg hover:text-gold transition-colors"
                      >
                        Não
                      </button>
                      <button
                        onClick={() => deletar(v.id)}
                        disabled={deletando}
                        className="px-2 py-1 text-[11px] font-medium text-red-400 border border-red-700/40 rounded-lg hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      >
                        Excluir
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditando(v); setErroSalvar(null); }}
                        className="p-1.5 text-gold-muted hover:text-gold transition-colors"
                        title="Editar lançamento"
                      >
                        {foiEditado
                          ? <Check size={15} className="text-emerald-400" />
                          : <Pencil size={15} />}
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setConfirmandoDelete(v.id)}
                          className="p-1.5 text-gold-muted hover:text-red-400 transition-colors"
                          title="Excluir lançamento"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {editando && (
        <ModalEditar
          venda={editando}
          barbeiros={barbeiros}
          onSalvar={salvar}
          onFechar={() => { setEditando(null); setErroSalvar(null); }}
          salvando={salvando}
          erroSalvar={erroSalvar}
        />
      )}
    </main>
  );
}
