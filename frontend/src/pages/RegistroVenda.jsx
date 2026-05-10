import { useState, useEffect, useRef } from 'react';
import { Scissors, CheckCircle, AlertCircle, Plus, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const FORMAS_PAGAMENTO = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix',      label: 'Pix' },
  { value: 'credito',  label: 'Crédito' },
  { value: 'debito',   label: 'Débito' },
  { value: 'cortesia', label: 'Cortesia' },
];

const TIPOS_CLIENTE = [
  { value: 'agendado',    label: 'Agendado (Booksy)' },
  { value: 'primeira_vez', label: 'Primeira vez' },
  { value: 'esporadico',  label: 'Esporádico (passou na porta)' },
];

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

const FORM_INICIAL = {
  profissional_id: '',
  servico:         '',
  valor:           '',
  forma_pagamento: 'dinheiro',
  desconto:        '',
  tipo_cliente:    'agendado',
  qtd_clientes:    1,
  data:            hojeISO(),
  observacao:      '',
};

const UPSELL_INICIAL = { servico: '', valor: '', forma_pagamento: 'dinheiro' };

// ─── Autocomplete de serviço ─────────────────────────────────────────────────

function ServicoAutocomplete({ value, onChange, onSelect, catalogo, placeholder }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  const sugestoes = value.length >= 1
    ? catalogo.filter(i => i.nome.toLowerCase().includes(value.toLowerCase())).slice(0, 10)
    : [];

  useEffect(() => {
    function fechar(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        required
        placeholder={placeholder ?? 'Ex.: Corte'}
        className="input-dark w-full"
      />
      {aberto && sugestoes.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 rounded-xl border border-surface-border bg-onix-200 shadow-xl max-h-56 overflow-y-auto">
          {sugestoes.map(item => (
            <li key={item.id}>
              <button
                type="button"
                onMouseDown={() => {
                  onSelect(item.nome, item.preco_venda);
                  setAberto(false);
                }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-onix-300/60 transition-colors flex justify-between items-center"
              >
                <span className="text-gold-light">{item.nome}</span>
                <span className="text-gold text-xs font-semibold ml-2 shrink-0">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco_venda)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function RegistroVenda() {
  const { user } = useAuth();
  const [barbeiros, setBarbeiros] = useState([]);
  const [catalogo,  setCatalogo]  = useState([]);
  const [form,      setForm]      = useState(FORM_INICIAL);
  const [upsell,    setUpsell]    = useState(UPSELL_INICIAL);
  const [temUpsell, setTemUpsell] = useState(false);
  const [enviando,  setEnviando]  = useState(false);
  const [sucesso,   setSucesso]   = useState(null);
  const [erro,      setErro]      = useState(null);

  useEffect(() => {
    api.profissionais({ apenas_barbeiros: 'true' }).then(setBarbeiros).catch(() => {});
    api.catalogo().then(d => setCatalogo(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function onChangeUpsell(e) {
    const { name, value } = e.target;
    setUpsell((u) => ({ ...u, [name]: value }));
  }

  function selecionarServico(nome, preco) {
    setForm(f => ({ ...f, servico: nome, valor: preco.toFixed(2) }));
  }

  function selecionarUpsell(nome, preco) {
    setUpsell(u => ({ ...u, servico: nome, valor: preco.toFixed(2) }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    setSucesso(null);
    try {
      const payload = {
        profissional_id: form.profissional_id ? parseInt(form.profissional_id) : undefined,
        servico:         form.servico.trim(),
        valor:           parseFloat(form.valor),
        forma_pagamento: form.forma_pagamento,
        desconto:        form.desconto ? parseFloat(form.desconto) : 0,
        tipo_cliente:    form.tipo_cliente,
        qtd_clientes:    parseInt(form.qtd_clientes) || 1,
        data:            form.data,
        ...(form.observacao.trim() ? { observacao: form.observacao.trim() } : {}),
      };

      const vendaPrincipal = await api.criarVenda(payload);

      if (temUpsell && upsell.servico.trim() && upsell.valor) {
        await api.criarVenda({
          ...payload,
          servico:         upsell.servico.trim(),
          valor:           parseFloat(upsell.valor),
          forma_pagamento: upsell.forma_pagamento,
          desconto:        0,
          upsell:          true,
          venda_origem_id: vendaPrincipal.id,
        });
      }

      setSucesso(vendaPrincipal);
      setTemUpsell(false);
      setUpsell(UPSELL_INICIAL);
      setForm((f) => ({ ...FORM_INICIAL, profissional_id: f.profissional_id, data: f.data }));
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 pb-12 pt-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 border border-gold-dark/40 mb-3 shadow-gold-sm">
          <Scissors size={22} className="text-gold" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif font-bold text-xl text-gold">Registro de Venda</h1>
        <p className="text-[11px] text-gold-muted uppercase tracking-widest mt-1">
          Unidade {user?.unidade ?? 'Mutinga'}
        </p>
      </div>

      {sucesso && (
        <div className="mb-5 p-4 rounded-xl bg-emerald-900/20 border border-emerald-700/40 text-emerald-400">
          <div className="flex items-center gap-2 font-semibold text-sm mb-1">
            <CheckCircle size={15} /> Venda registrada!
          </div>
          <p className="text-xs text-emerald-300/70">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sucesso.valor)}
            {' — '}{sucesso.servico}
          </p>
        </div>
      )}

      {erro && (
        <div className="mb-5 flex items-center gap-2 p-4 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 text-sm">
          <AlertCircle size={15} className="shrink-0" /> {erro}
        </div>
      )}

      <form onSubmit={onSubmit} className="card-premium p-5 space-y-4">

        {/* Barbeiro */}
        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Barbeiro *</label>
          <select name="profissional_id" value={form.profissional_id} onChange={onChange} required className="input-dark w-full">
            <option value="">Selecione o barbeiro</option>
            {barbeiros.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        </div>

        {/* Serviço */}
        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Serviço *</label>
          <ServicoAutocomplete
            value={form.servico}
            onChange={(v) => setForm(f => ({ ...f, servico: v }))}
            onSelect={selecionarServico}
            catalogo={catalogo}
          />
        </div>

        {/* Valor + Pagamento */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Valor (R$) *</label>
            <input
              type="number" name="valor" value={form.valor} onChange={onChange} required
              min="0" step="0.01" placeholder="0,00" className="input-dark w-full"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Pagamento *</label>
            <select name="forma_pagamento" value={form.forma_pagamento} onChange={onChange} className="input-dark w-full">
              {FORMAS_PAGAMENTO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>

        {/* Qtd Clientes */}
        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">
            Qtd. de Clientes <span className="normal-case text-gold-muted/50">(ex: pai e filho)</span>
          </label>
          <input
            type="number" name="qtd_clientes" value={form.qtd_clientes} onChange={onChange}
            min="1" step="1" className="input-dark w-24"
          />
        </div>

        {/* Serviço adicional (Upsell) */}
        <div className="border border-surface-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setTemUpsell((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] text-gold-muted uppercase tracking-wider hover:text-gold transition-colors"
          >
            <span>+ Serviço adicional (upsell)</span>
            <ChevronDown size={13} className={`transition-transform ${temUpsell ? 'rotate-180' : ''}`} />
          </button>
          {temUpsell && (
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-surface-border">
              <div>
                <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Serviço extra *</label>
                <ServicoAutocomplete
                  value={upsell.servico}
                  onChange={(v) => setUpsell(u => ({ ...u, servico: v }))}
                  onSelect={selecionarUpsell}
                  catalogo={catalogo}
                  placeholder="Ex.: Sobrancelha"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Valor (R$) *</label>
                  <input
                    type="number" name="valor" value={upsell.valor} onChange={onChangeUpsell}
                    min="0" step="0.01" placeholder="0,00" className="input-dark w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Pagamento</label>
                  <select name="forma_pagamento" value={upsell.forma_pagamento} onChange={onChangeUpsell} className="input-dark w-full">
                    {FORMAS_PAGAMENTO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Origem do cliente */}
        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Origem do cliente</label>
          <select name="tipo_cliente" value={form.tipo_cliente} onChange={onChange} className="input-dark w-full">
            {TIPOS_CLIENTE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Desconto */}
        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">
            Desconto (R$) <span className="normal-case text-gold-muted/50">(opcional)</span>
          </label>
          <input
            type="number" name="desconto" value={form.desconto} onChange={onChange}
            min="0" step="0.01" placeholder="0,00" className="input-dark w-36"
          />
        </div>

        {/* Data */}
        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Data *</label>
          <input type="date" name="data" value={form.data} onChange={onChange} required className="input-dark w-full" />
        </div>

        {/* Observação */}
        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">
            Observação <span className="normal-case text-gold-muted/50">(opcional)</span>
          </label>
          <input
            type="text" name="observacao" value={form.observacao} onChange={onChange}
            placeholder="Produto, desconto…" className="input-dark w-full"
          />
        </div>

        <button
          type="submit" disabled={enviando}
          className="btn-gold w-full justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {enviando
            ? <span className="w-4 h-4 border-2 border-onix/30 border-t-onix rounded-full animate-spin" />
            : <Plus size={15} />}
          {enviando ? 'Registrando…' : 'Registrar Venda'}
        </button>
      </form>
    </main>
  );
}
