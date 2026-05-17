import { useState, useEffect, useRef } from 'react';
import { Scissors, CheckCircle, AlertCircle, Plus, ChevronDown, Search, Tag, RefreshCw, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useInvalidarDashboard } from '../hooks/useBarbeariaData';

const FORMAS_PAGAMENTO = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix',      label: 'Pix' },
  { value: 'credito',  label: 'Crédito' },
  { value: 'debito',   label: 'Débito' },
  { value: 'cortesia', label: 'Cortesia' },
];

const ORIGENS_UNIFICADAS = [
  { value: 'agendado',     label: 'Agendado (Booksy)', campo: 'tipo'   },
  { value: 'primeira_vez', label: 'Primeira vez',      campo: 'tipo'   },
  { value: 'esporadico',   label: 'Esporádico',        campo: 'tipo'   },
  { value: 'whatsapp',     label: 'WhatsApp',          campo: 'origem' },
  { value: 'indicacao',    label: 'Indicação',         campo: 'origem' },
];

const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Outra'];

const TAXAS_PAGBANK = { debito: 0.0119, credito: 0.0349, pix: 0, dinheiro: 0, cortesia: 0 };

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDias(dataISO, n) {
  const d = new Date(dataISO + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtDataBR(iso) {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

// ─── Autocomplete (serviços e produtos) ─────────────────────────────────────

function CatalogoAutocomplete({ value, onChange, onSelect, catalogo, placeholder, required, grupos }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  const sugestoes = catalogo.filter(i => !value || i.nome.toLowerCase().includes(value.toLowerCase()));
  const individuais = grupos ? sugestoes.filter(i => !i.nome.toLowerCase().startsWith('combo')) : [];
  const combos      = grupos ? sugestoes.filter(i =>  i.nome.toLowerCase().startsWith('combo')) : [];

  useEffect(() => {
    function fechar(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  function ItemBtn({ item }) {
    return (
      <button
        type="button"
        onMouseDown={() => { onSelect(item.nome, item.preco_venda); setAberto(false); }}
        className="w-full text-left px-3 py-2.5 text-sm hover:bg-onix-300/60 transition-colors flex justify-between items-center"
      >
        <span className="text-gold-light">{item.nome}</span>
        <span className="text-gold text-xs font-semibold ml-2 shrink-0">{fmt(item.preco_venda)}</span>
      </button>
    );
  }

  return (
    <div ref={ref} className={`relative ${aberto ? 'z-[9999]' : ''}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setAberto(true); }}
          onFocus={() => setAberto(true)}
          required={required}
          placeholder={placeholder ?? 'Digite ou selecione...'}
          className="input-dark w-full pr-8"
        />
        <ChevronDown
          size={14}
          onClick={() => setAberto(v => !v)}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-gold-muted cursor-pointer transition-transform ${aberto ? 'rotate-180' : ''}`}
        />
      </div>
      {aberto && sugestoes.length > 0 && (
        <ul className="absolute w-full mt-1 rounded-xl border border-surface-border bg-onix-200 shadow-xl max-h-72 overflow-y-auto">
          {grupos ? (
            <>
              {individuais.length > 0 && (
                <>
                  <li className="px-3 pt-2 pb-1 text-[10px] text-gold-muted/60 uppercase tracking-widest font-semibold select-none">Serviços</li>
                  {individuais.map(item => <li key={item.id}><ItemBtn item={item} /></li>)}
                </>
              )}
              {combos.length > 0 && (
                <>
                  <li className={`px-3 pt-2 pb-1 text-[10px] text-gold-muted/60 uppercase tracking-widest font-semibold select-none ${individuais.length > 0 ? 'border-t border-surface-border mt-1' : ''}`}>Combos</li>
                  {combos.map(item => <li key={item.id}><ItemBtn item={item} /></li>)}
                </>
              )}
            </>
          ) : (
            sugestoes.map(item => <li key={item.id}><ItemBtn item={item} /></li>)
          )}
        </ul>
      )}
    </div>
  );
}

const SEM_SERVICO = { id: '__sem_servico__', nome: 'Sem Serviço / Apenas Venda', preco_venda: 0, controla_estoque: false };

// ─── Autocomplete de clientes cadastrados ────────────────────────────────────

function ClienteAutocomplete({ value, onChange, onSelectCliente, onCadastrar }) {
  const [sugestoes, setSugestoes] = useState([]);
  const [aberto,    setAberto]    = useState(false);
  const [buscando,  setBuscando]  = useState(false);
  const timer   = useRef(null);
  const wrapper = useRef(null);

  useEffect(() => {
    function fechar(e) {
      if (wrapper.current && !wrapper.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  function onInput(e) {
    const v = e.target.value;
    onChange(v);
    clearTimeout(timer.current);
    if (v.trim().length < 2) { setSugestoes([]); setAberto(false); return; }
    setBuscando(true);
    timer.current = setTimeout(async () => {
      try {
        const rows = await api.clientes({ busca: v.trim() });
        setSugestoes(rows);
        setAberto(true);
      } catch {
        setSugestoes([]);
        setAberto(false);
      } finally {
        setBuscando(false);
      }
    }, 380);
  }

  function selecionar(c) {
    onSelectCliente(c);
    setAberto(false);
    setSugestoes([]);
  }

  const mostraDropdown = aberto && value.trim().length >= 2;

  return (
    <div ref={wrapper} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={onInput}
          onFocus={() => { if (value.trim().length >= 2) setAberto(true); }}
          placeholder="Ex.: João Silva"
          className="input-dark w-full pr-8"
          required
          pattern="[A-Za-zÀ-ÿ\s'\-]+"
          title="Somente letras e espaços"
          onKeyDown={e => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
        />
        {buscando && (
          <RefreshCw size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-gold-muted pointer-events-none" />
        )}
      </div>

      {mostraDropdown && (
        <ul className="absolute w-full mt-1 rounded-xl border border-surface-border bg-onix-200 shadow-xl z-50 max-h-56 overflow-y-auto">
          {sugestoes.length > 0 ? (
            sugestoes.map(c => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseDown={() => selecionar(c)}
                  className="w-full text-left px-4 py-2.5 hover:bg-onix-300/60 transition-colors"
                >
                  <p className="text-sm text-gold-light">{c.nome}</p>
                  <p className="text-[11px] text-gold-muted">
                    {[c.contato, c.unidade, c.barbeiro_responsavel_nome].filter(Boolean).join(' · ')}
                  </p>
                </button>
              </li>
            ))
          ) : !buscando ? (
            <li className="px-4 py-3 flex items-center justify-between gap-2">
              <p className="text-xs text-gold-muted">Nenhum cliente encontrado na base.</p>
              {onCadastrar ? (
                <button
                  type="button"
                  onMouseDown={onCadastrar}
                  className="flex items-center gap-1 text-xs text-gold hover:text-gold-light font-semibold shrink-0"
                >
                  <Plus size={12} /> Cadastrar
                </button>
              ) : (
                <span className="text-[11px] text-amber-400/80 shrink-0">Solicite ao admin</span>
              )}
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

// ─── Aba: Venda Normal ───────────────────────────────────────────────────────

const FORM_INICIAL = {
  profissional_id: '',
  servico:         '',
  valor:           '',
  produto:         '',
  produto_valor:   '',
  produto_qtd:     1,
  desconto:        '',
  origens:         ['agendado'],
  nome_cliente:    '',
  qtd_clientes:    1,
  data:            hojeISO(),
  observacao:      '',
};

const UPSELL_INICIAL = { servico: '', valor: '' };

function AbaVenda({ barbeiros, catalogo, user, onIrParaClientes }) {
  const invalidarDashboard = useInvalidarDashboard();

  const [form,       setForm]       = useState(FORM_INICIAL);
  const [upsell,     setUpsell]     = useState(UPSELL_INICIAL);
  const [temUpsell,  setTemUpsell]  = useState(false);
  const [pagamentos, setPagamentos] = useState([{ forma: 'dinheiro', valor: '', bandeira: '' }]);
  const [enviando,   setEnviando]   = useState(false);
  const [sucesso,    setSucesso]    = useState(null);
  const [erro,       setErro]       = useState(null);

  const catalogoServicos = [
    SEM_SERVICO,
    ...catalogo.filter(i => !i.controla_estoque).sort((a, b) => {
      const aCombo = a.nome.toLowerCase().startsWith('combo');
      const bCombo = b.nome.toLowerCase().startsWith('combo');
      if (aCombo !== bCombo) return aCombo ? 1 : -1;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    }),
  ];
  const catalogoProdutos = catalogo.filter(i => i.controla_estoque);

  function onChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }
  function onChangeUpsell(e) {
    const { name, value } = e.target;
    setUpsell(u => ({ ...u, [name]: value }));
  }
  function selecionarServico(nome, preco) {
    setForm(f => ({ ...f, servico: nome, valor: parseFloat(preco).toFixed(2) }));
  }
  function selecionarProduto(nome, preco) {
    setForm(f => ({ ...f, produto: nome, produto_valor: parseFloat(preco).toFixed(2) }));
  }
  function selecionarUpsell(nome, preco) {
    setUpsell(u => ({ ...u, servico: nome, valor: parseFloat(preco).toFixed(2) }));
  }
  function onSelectCliente(c) {
    setForm(f => ({ ...f, nome_cliente: c.nome }));
  }

  // ─── Cálculos em tempo real ───────────────────────────────────────────────
  const totalServico = (parseFloat(form.valor) || 0) * (parseInt(form.qtd_clientes) || 1);
  const totalProduto = form.produto.trim()
    ? (parseFloat(form.produto_valor) || 0) * (parseInt(form.produto_qtd) || 1)
    : 0;
  const totalUpsell = (temUpsell && upsell.servico.trim())
    ? (parseFloat(upsell.valor) || 0)
    : 0;
  const desconto   = parseFloat(form.desconto) || 0;
  const totalBruto = Math.max(0, totalServico + totalProduto + totalUpsell - desconto);
  const totalPago  = pagamentos.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
  const restante   = parseFloat((totalBruto - totalPago).toFixed(2));

  // Auto-preenche valor quando há 1 único método de pagamento
  useEffect(() => {
    setPagamentos(prev => {
      if (prev.length === 1) {
        return [{ ...prev[0], valor: totalBruto > 0 ? totalBruto.toFixed(2) : '' }];
      }
      return prev;
    });
  }, [totalBruto]);

  // ─── Helpers de pagamento ─────────────────────────────────────────────────
  function addPagamento() {
    const sugerido = restante > 0 ? restante.toFixed(2) : '';
    setPagamentos(ps => [...ps, { forma: 'dinheiro', valor: sugerido, bandeira: '' }]);
  }
  function removePagamento(i) {
    setPagamentos(ps => ps.filter((_, idx) => idx !== i));
  }
  function updatePagamento(i, field, value) {
    setPagamentos(ps => ps.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  }

  async function onSubmit(e) {
    e.preventDefault();

    if (Math.abs(restante) > 0.01) {
      setErro(restante > 0
        ? `Faltam ${fmt(restante)} para completar o pagamento.`
        : `O valor pago excede o total em ${fmt(Math.abs(restante))}.`
      );
      return;
    }

    setEnviando(true);
    setErro(null);
    setSucesso(null);

    try {
      const barbeiro = barbeiros.find(b => b.id === parseInt(form.profissional_id));
      const unidade = barbeiro?.unidade ?? user?.unidade;

      const basePayload = {
        ...(unidade ? { unidade } : {}),
        profissional_id: form.profissional_id ? parseInt(form.profissional_id) : undefined,
        servico:         form.servico.trim(),
        tipo_cliente:    form.origens.find(o => ['agendado','esporadico','primeira_vez'].includes(o)) ?? 'agendado',
        origem_cliente:  form.origens.find(o => ['whatsapp','indicacao'].includes(o)) ?? undefined,
        data:            form.data,
        nome_cliente:    form.nome_cliente.trim(),
        ...(form.observacao.trim() ? { observacao: form.observacao.trim() } : {}),
      };

      const primeiraForma    = pagamentos[0]?.forma ?? 'dinheiro';
      const primeiraBandeira = pagamentos[0]?.bandeira || undefined;
      let primeiraVendaId;

      if (pagamentos.length === 1) {
        // Pagamento único — fluxo tradicional
        const p = pagamentos[0];
        const venda = await api.criarVenda({
          ...basePayload,
          valor:           parseFloat(form.valor),
          qtd_clientes:    parseInt(form.qtd_clientes) || 1,
          desconto:        parseFloat(form.desconto) || 0,
          forma_pagamento: p.forma,
          bandeira_cartao: p.bandeira || undefined,
        });
        primeiraVendaId = venda.id;
      } else {
        // Pagamento dividido — uma venda por método
        for (let i = 0; i < pagamentos.length; i++) {
          const p = pagamentos[i];
          const venda = await api.criarVenda({
            ...basePayload,
            valor:           parseFloat(p.valor),
            qtd_clientes:    1,
            desconto:        0,
            forma_pagamento: p.forma,
            bandeira_cartao: p.bandeira || undefined,
          });
          if (i === 0) primeiraVendaId = venda.id;
        }
      }

      if (form.produto.trim() && form.produto_valor) {
        await api.criarVenda({
          ...basePayload,
          servico:         form.produto.trim(),
          valor:           parseFloat(form.produto_valor) * (parseInt(form.produto_qtd) || 1),
          qtd_clientes:    1,
          desconto:        0,
          forma_pagamento: primeiraForma,
          bandeira_cartao: primeiraBandeira,
          upsell:          true,
          venda_origem_id: primeiraVendaId,
          tipo_item:       'produto',
        });
      }

      if (temUpsell && upsell.servico.trim() && upsell.valor) {
        await api.criarVenda({
          ...basePayload,
          servico:         upsell.servico.trim(),
          valor:           parseFloat(upsell.valor),
          qtd_clientes:    1,
          desconto:        0,
          forma_pagamento: primeiraForma,
          bandeira_cartao: primeiraBandeira,
          upsell:          true,
          venda_origem_id: primeiraVendaId,
        });
      }

      setSucesso({ valor: totalBruto, servico: form.servico });
      setTemUpsell(false);
      setUpsell(UPSELL_INICIAL);
      setPagamentos([{ forma: 'dinheiro', valor: '', bandeira: '' }]);
      setForm(f => ({ ...FORM_INICIAL, profissional_id: f.profissional_id, data: f.data }));
      invalidarDashboard(); // atualiza Dashboard e Lançamentos imediatamente

    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const statusPagamento = Math.abs(restante) < 0.01
    ? { label: '✓ Quitado', cor: 'text-emerald-400' }
    : restante > 0
      ? { label: `Falta ${fmt(restante)}`, cor: 'text-amber-400' }
      : { label: `Excede ${fmt(Math.abs(restante))}`, cor: 'text-red-400' };

  return (
    <>
      {sucesso && (
        <div className="mb-5 p-4 rounded-xl bg-emerald-900/20 border border-emerald-700/40 text-emerald-400">
          <div className="flex items-center gap-2 font-semibold text-sm mb-1">
            <CheckCircle size={15} /> Venda registrada!
          </div>
          <p className="text-xs text-emerald-300/70">{fmt(sucesso.valor)} — {sucesso.servico}</p>
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
            {barbeiros.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        </div>

        {/* Nome do Cliente */}
        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Nome do cliente *</label>
          <ClienteAutocomplete
            value={form.nome_cliente}
            onChange={v => setForm(f => ({ ...f, nome_cliente: v }))}
            onSelectCliente={onSelectCliente}
            onCadastrar={onIrParaClientes}
          />
        </div>

        {/* Serviço */}
        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Serviço *</label>
          <CatalogoAutocomplete
            value={form.servico}
            onChange={v => setForm(f => ({ ...f, servico: v }))}
            onSelect={selecionarServico}
            catalogo={catalogoServicos}
            placeholder="Ex.: Corte"
            required
            grupos
          />
        </div>

        {/* Qtd. de Clientes — logo após o serviço */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">
              Qtd. de Clientes <span className="normal-case text-gold-muted/50">(ex: pai e filho)</span>
            </label>
            <input type="number" name="qtd_clientes" value={form.qtd_clientes} onChange={onChange}
              min="1" step="1" className="input-dark w-full" />
          </div>
          <div>
            <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Valor por cliente (R$) *</label>
            <input
              type="number" name="valor" value={form.valor} onChange={onChange} required
              min="0" step="0.01" placeholder="0,00" className="input-dark w-full"
            />
          </div>
        </div>

        <div className="h-px bg-surface-border" />

        {/* Produto */}
        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">
            Produto <span className="normal-case text-gold-muted/50">(opcional)</span>
          </label>
          <CatalogoAutocomplete
            value={form.produto}
            onChange={v => setForm(f => ({ ...f, produto: v, ...(v === '' ? { produto_valor: '', produto_qtd: 1 } : {}) }))}
            onSelect={selecionarProduto}
            catalogo={catalogoProdutos}
            placeholder="Ex.: Pomada Matt"
          />
        </div>

        {form.produto.trim() && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Qtd. do produto</label>
              <input type="number" name="produto_qtd" value={form.produto_qtd} onChange={onChange}
                min="1" step="1" className="input-dark w-full" />
            </div>
            <div>
              <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Valor unitário (R$)</label>
              <input type="number" name="produto_valor" value={form.produto_valor} onChange={onChange}
                min="0" step="0.01" placeholder="0,00" className="input-dark w-full" />
            </div>
          </div>
        )}

        <div className="h-px bg-surface-border" />

        {/* Upsell */}
        <div className="border border-surface-border rounded-xl">
          <button type="button" onClick={() => setTemUpsell(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] text-gold-muted uppercase tracking-wider hover:text-gold transition-colors">
            <span>+ Serviço adicional (upsell)</span>
            <ChevronDown size={13} className={`transition-transform ${temUpsell ? 'rotate-180' : ''}`} />
          </button>
          {temUpsell && (
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-surface-border">
              <div>
                <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Serviço extra *</label>
                <CatalogoAutocomplete value={upsell.servico}
                  onChange={v => setUpsell(u => ({ ...u, servico: v }))}
                  onSelect={selecionarUpsell} catalogo={catalogoServicos}
                  placeholder="Ex.: Sobrancelha" grupos />
              </div>
              <div>
                <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Valor (R$) *</label>
                <input type="number" name="valor" value={upsell.valor} onChange={onChangeUpsell}
                  min="0" step="0.01" placeholder="0,00" className="input-dark w-full" />
              </div>
            </div>
          )}
        </div>

        {/* Origem do cliente */}
        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Origem do cliente</label>
          <div className="flex flex-wrap gap-2">
            {ORIGENS_UNIFICADAS.map(op => {
              const ativo = form.origens.includes(op.value);
              return (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => setForm(f => ({
                    ...f,
                    origens: ativo
                      ? f.origens.filter(o => o !== op.value)
                      : [...f.origens, op.value],
                  }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    ativo
                      ? 'bg-gold text-onix border-gold'
                      : 'bg-transparent text-gold-muted border-surface-border hover:border-gold/50 hover:text-gold'
                  }`}
                >
                  {op.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">
            Desconto (R$) <span className="normal-case text-gold-muted/50">(opcional)</span>
          </label>
          <input type="number" name="desconto" value={form.desconto} onChange={onChange}
            min="0" step="0.01" placeholder="0,00" className="input-dark w-36" />
        </div>

        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Data *</label>
          <input type="date" name="data" value={form.data} onChange={onChange} required className="input-dark w-full" />
        </div>

        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">
            Observação <span className="normal-case text-gold-muted/50">(opcional)</span>
          </label>
          <input type="text" name="observacao" value={form.observacao} onChange={onChange}
            placeholder="Observações gerais…" className="input-dark w-full" />
        </div>

        {/* ─── RESUMO DO PEDIDO ──────────────────────────────────────────────── */}
        {totalBruto > 0 && (
          <div className="rounded-xl border border-gold-dark/40 bg-gold/5 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gold-dark/30">
              <p className="text-[11px] text-gold-muted uppercase tracking-wider font-semibold">Resumo do Pedido</p>
            </div>
            <div className="px-4 py-3 space-y-2 text-xs">
              {totalServico > 0 && (
                <div className="flex justify-between">
                  <span className="text-gold-muted">
                    {form.servico || 'Serviço'}
                    {parseInt(form.qtd_clientes) > 1 ? ` × ${form.qtd_clientes}` : ''}
                  </span>
                  <span className="text-gold-light tabular-nums">{fmt(totalServico)}</span>
                </div>
              )}
              {totalProduto > 0 && (
                <div className="flex justify-between">
                  <span className="text-gold-muted">
                    {form.produto}
                    {parseInt(form.produto_qtd) > 1 ? ` × ${form.produto_qtd}` : ''}
                  </span>
                  <span className="text-gold-light tabular-nums">{fmt(totalProduto)}</span>
                </div>
              )}
              {totalUpsell > 0 && (
                <div className="flex justify-between">
                  <span className="text-gold-muted">{upsell.servico}</span>
                  <span className="text-gold-light tabular-nums">{fmt(totalUpsell)}</span>
                </div>
              )}
              {desconto > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Desconto</span>
                  <span className="tabular-nums">− {fmt(desconto)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2.5 mt-1 border-t border-gold-dark/30">
                <span className="text-[11px] text-gold-muted uppercase tracking-wider font-semibold">Total Bruto</span>
                <span className="font-bold text-gold text-xl tabular-nums">{fmt(totalBruto)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── FORMA DE PAGAMENTO ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-surface-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-surface-border bg-surface-hover/30 flex items-center justify-between">
            <p className="text-[11px] text-gold-muted uppercase tracking-wider font-semibold">Forma de Pagamento</p>
            {pagamentos.length > 1 && (
              <span className={`text-[11px] font-semibold ${statusPagamento.cor}`}>
                {statusPagamento.label}
              </span>
            )}
          </div>

          <div className="p-4 space-y-3">
            {pagamentos.map((p, i) => (
              <div key={i} className="space-y-2">
                <div className="flex gap-2 items-end">
                  {/* Método */}
                  <div className="flex-1 min-w-0">
                    {i === 0 && (
                      <label className="block text-[10px] text-gold-muted uppercase tracking-wider mb-1">Método</label>
                    )}
                    <select
                      value={p.forma}
                      onChange={e => updatePagamento(i, 'forma', e.target.value)}
                      className="input-dark w-full text-sm"
                    >
                      {FORMAS_PAGAMENTO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>

                  {/* Valor */}
                  <div className="w-28 shrink-0">
                    {i === 0 && (
                      <label className="block text-[10px] text-gold-muted uppercase tracking-wider mb-1">Valor (R$)</label>
                    )}
                    <input
                      type="number"
                      value={p.valor}
                      onChange={e => updatePagamento(i, 'valor', e.target.value)}
                      min="0" step="0.01" placeholder="0,00"
                      className={`input-dark w-full text-sm ${pagamentos.length === 1 ? 'opacity-60 cursor-default' : ''}`}
                      readOnly={pagamentos.length === 1}
                    />
                  </div>

                  {/* Remover */}
                  {pagamentos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePagamento(i)}
                      className="text-red-400/50 hover:text-red-400 transition-colors pb-1 shrink-0"
                      title="Remover método"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Bandeira (se cartão) */}
                {(p.forma === 'credito' || p.forma === 'debito') && (
                  <select
                    value={p.bandeira}
                    onChange={e => updatePagamento(i, 'bandeira', e.target.value)}
                    className="input-dark w-full text-sm"
                  >
                    <option value="">Bandeira do cartão (opcional)</option>
                    {BANDEIRAS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                )}

                {/* Taxa PagBank por método */}
                {(() => {
                  const taxa = TAXAS_PAGBANK[p.forma] ?? 0;
                  const val  = parseFloat(p.valor) || 0;
                  if (taxa > 0 && val > 0) {
                    return (
                      <div className="flex justify-between text-[10px] text-orange-400/70 px-1">
                        <span>Taxa PagBank ({(taxa * 100).toFixed(2)}%)</span>
                        <span>− {fmt(val * taxa)} → líquido {fmt(val * (1 - taxa))}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            ))}

            {/* Dividir pagamento */}
            <button
              type="button"
              onClick={addPagamento}
              className="w-full py-2.5 text-[11px] text-gold-muted uppercase tracking-wider border border-dashed border-surface-border rounded-lg hover:border-gold/50 hover:text-gold transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={11} /> Dividir em outro método
            </button>

            {/* Indicador de quanto falta/resta quando há split */}
            {pagamentos.length > 1 && Math.abs(restante) > 0.01 && (
              <div className={`flex justify-between text-xs px-1 ${restante > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                <span>{restante > 0 ? 'Ainda a pagar:' : 'Excede o total em:'}</span>
                <span className="font-semibold tabular-nums">{fmt(Math.abs(restante))}</span>
              </div>
            )}
          </div>
        </div>

        <button type="submit" disabled={enviando}
          className="btn-gold w-full justify-center py-3 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed">
          {enviando
            ? <span className="w-4 h-4 border-2 border-onix/30 border-t-onix rounded-full animate-spin" />
            : <Plus size={15} />}
          {enviando ? 'Registrando…' : 'Registrar Venda'}
        </button>
      </form>
    </>
  );
}

// ─── Aba: Combos (Recorrência) ───────────────────────────────────────────────

const COMBO_FORM_INICIAL = {
  forma_pagamento: 'credito',
  bandeira_cartao: '',
  novo_servico:    '',
  novo_valor:      '',
  cliente_contato: '',
  data_nascimento: '',
  profissional_id: '',
};

function AbaCombo({ barbeiros, catalogo, user }) {
  const invalidarDashboard = useInvalidarDashboard();

  const [busca,          setBusca]          = useState('');
  const [buscando,       setBuscando]       = useState(false);
  const [combo,          setCombo]          = useState(undefined);
  const [alterarPlano,   setAlterarPlano]   = useState(false);
  const [comboForm,      setComboForm]      = useState(COMBO_FORM_INICIAL);
  const [enviando,       setEnviando]       = useState(false);
  const [sucesso,        setSucesso]        = useState(null);
  const [erro,           setErro]           = useState(null);

  const planos = catalogo.filter(i =>
    i.categoria === 'combo' || i.nome.toLowerCase().includes('combo novo')
  );

  async function buscarCombo(e) {
    e.preventDefault();
    if (!busca.trim() || busca.trim().length < 2) return;
    setBuscando(true);
    setCombo(undefined);
    setErro(null);
    setSucesso(null);
    setAlterarPlano(false);
    try {
      const resultado = await api.buscarCombo({ nome: busca.trim() });
      setCombo(resultado);
    } catch (err) {
      setErro(err.message);
    } finally {
      setBuscando(false);
    }
  }

  function onChangeForm(e) {
    const { name, value } = e.target;
    if (name === 'novo_servico') {
      const plano = planos.find(p => p.nome === value);
      setComboForm(f => ({
        ...f,
        novo_servico: value,
        novo_valor:   plano ? parseFloat(plano.preco_venda).toFixed(2) : '',
      }));
    } else {
      setComboForm(f => ({ ...f, [name]: value }));
    }
  }

  async function registrarUso(e) {
    e.preventDefault();
    if (!combo?.id) return;
    setEnviando(true);
    setErro(null);
    try {
      const payload = {
        combo_id:        combo.id,
        servico:         combo.servicos,
        valor:           parseFloat(combo.valor),
        forma_pagamento: comboForm.forma_pagamento,
        bandeira_cartao: comboForm.bandeira_cartao || undefined,
        alterar_plano:   alterarPlano,
        novo_servico:    alterarPlano ? comboForm.novo_servico : undefined,
        novo_valor:      alterarPlano && comboForm.novo_valor ? parseFloat(comboForm.novo_valor) : undefined,
      };
      const result = await api.registrarUsoCombo(payload);
      setSucesso({ tipo: 'uso', venda: result.venda, combo });
      setBusca('');
      setCombo(undefined);
      setAlterarPlano(false);
      setComboForm(COMBO_FORM_INICIAL);
      invalidarDashboard();
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function ativarNovoCombo(e) {
    e.preventDefault();
    if (!comboForm.novo_servico) { setErro('Selecione um plano de combo.'); return; }
    setEnviando(true);
    setErro(null);
    try {
      const planoSelecionado = planos.find(p => p.nome === comboForm.novo_servico);
      const valor = comboForm.novo_valor ? parseFloat(comboForm.novo_valor)
                                         : parseFloat(planoSelecionado?.preco_venda ?? 0);
      const payload = {
        cliente_nome:    busca.trim(),
        cliente_contato: comboForm.cliente_contato || undefined,
        profissional_id: comboForm.profissional_id ? parseInt(comboForm.profissional_id) : undefined,
        servicos:        comboForm.novo_servico,
        valor,
        forma_pagamento: comboForm.forma_pagamento,
        bandeira_cartao: comboForm.bandeira_cartao || undefined,
        ...(user?.unidade ? { unidade: user.unidade } : {}),
      };
      const result = await api.ativarCombo(payload);
      setSucesso({ tipo: 'ativacao', venda: result.venda, combo: result.combo });
      setBusca('');
      setCombo(undefined);
      setComboForm(COMBO_FORM_INICIAL);
      invalidarDashboard();
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const hoje = hojeISO();
  const comboAtivo   = combo && combo.data_vencimento >= hoje;
  const comboVencido = combo && combo.data_vencimento < hoje;

  return (
    <div className="space-y-4">
      {sucesso && (
        <div className="p-4 rounded-xl bg-emerald-900/20 border border-emerald-700/40 text-emerald-400">
          <div className="flex items-center gap-2 font-semibold text-sm mb-1">
            <CheckCircle size={15} />
            {sucesso.tipo === 'uso' ? 'Uso registrado!' : 'Combo ativado!'}
          </div>
          <p className="text-xs text-emerald-300/70">
            {sucesso.tipo === 'uso'
              ? `Atendimento de ${sucesso.combo?.cliente_nome} registrado — ${fmt(sucesso.venda?.valor)}`
              : `${sucesso.combo?.cliente_nome} — Validade: ${fmtDataBR(sucesso.combo?.data_vencimento)}`
            }
          </p>
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 text-sm">
          <AlertCircle size={15} className="shrink-0" /> {erro}
        </div>
      )}

      <div className="card-premium p-5 space-y-4">
        <div>
          <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Buscar cliente pelo nome *</label>
          <form onSubmit={buscarCombo} className="flex gap-2">
            <input
              type="text"
              value={busca}
              onChange={e => { setBusca(e.target.value); setCombo(undefined); setSucesso(null); }}
              placeholder="Ex.: João Silva"
              className="input-dark flex-1"
              required
              minLength={2}
            />
            <button type="submit" disabled={buscando || busca.trim().length < 2}
              className="btn-outline-gold px-3 disabled:opacity-50 shrink-0">
              {buscando
                ? <RefreshCw size={14} className="animate-spin" />
                : <Search size={14} />}
            </button>
          </form>
        </div>

        {comboAtivo && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle size={14} /> Combo ativo — {combo.cliente_nome}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gold-muted">Plano</span>
                  <p className="text-gold-light mt-0.5">{combo.servicos}</p>
                </div>
                <div>
                  <span className="text-gold-muted">Valor</span>
                  <p className="text-gold font-semibold mt-0.5">{fmt(combo.valor)}</p>
                </div>
                <div>
                  <span className="text-gold-muted">Início</span>
                  <p className="text-gold-light mt-0.5">{fmtDataBR(combo.data_aquisicao)}</p>
                </div>
                <div>
                  <span className="text-gold-muted">Validade</span>
                  <p className="text-gold-light mt-0.5">{fmtDataBR(combo.data_vencimento)}</p>
                </div>
              </div>
            </div>

            <form onSubmit={registrarUso} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Pagamento</label>
                  <select name="forma_pagamento" value={comboForm.forma_pagamento} onChange={onChangeForm} className="input-dark w-full">
                    {FORMAS_PAGAMENTO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                {(comboForm.forma_pagamento === 'credito' || comboForm.forma_pagamento === 'debito') && (
                  <div>
                    <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Bandeira</label>
                    <select name="bandeira_cartao" value={comboForm.bandeira_cartao} onChange={onChangeForm} className="input-dark w-full">
                      <option value="">Selecione...</option>
                      {BANDEIRAS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={alterarPlano}
                  onChange={e => setAlterarPlano(e.target.checked)}
                  className="w-4 h-4 accent-gold"
                />
                <span className="text-sm text-gold-light">Deseja alterar o plano para o próximo mês?</span>
              </label>

              {alterarPlano && (
                <div className="rounded-xl border border-gold-dark/30 bg-gold/5 p-4 space-y-3">
                  <p className="text-[11px] text-gold-muted uppercase tracking-wider">Novo plano</p>
                  <div>
                    <select name="novo_servico" value={comboForm.novo_servico} onChange={onChangeForm} className="input-dark w-full" required={alterarPlano}>
                      <option value="">Selecione o novo plano</option>
                      {planos.map(p => (
                        <option key={p.id} value={p.nome}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Valor</label>
                    <input type="number" name="novo_valor" value={comboForm.novo_valor} onChange={onChangeForm}
                      min="0" step="0.01" placeholder="0,00" className="input-dark w-36" />
                  </div>
                  <p className="text-[10px] text-gold-muted/70">
                    Vigência atual: até {fmtDataBR(combo.data_vencimento)} → novo ciclo até {fmtDataBR(addDias(combo.data_vencimento, 30))}
                  </p>
                </div>
              )}

              <button type="submit" disabled={enviando}
                className="btn-gold w-full justify-center py-2.5 disabled:opacity-50">
                {enviando
                  ? <span className="w-4 h-4 border-2 border-onix/30 border-t-onix rounded-full animate-spin" />
                  : <CheckCircle size={15} />}
                {enviando ? 'Registrando…' : 'Registrar Uso'}
              </button>
            </form>
          </div>
        )}

        {comboVencido && (
          <div className="p-3 rounded-xl border border-amber-700/40 bg-amber-900/10 text-amber-400 text-sm">
            <p className="font-semibold">Combo vencido — {combo.cliente_nome}</p>
            <p className="text-xs mt-0.5">Venceu em {fmtDataBR(combo.data_vencimento)}. Renove abaixo ou na tela de Combos.</p>
          </div>
        )}

        {combo === null && busca.trim().length >= 2 && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl border border-gold-dark/30 bg-gold/5 text-gold-muted text-sm">
              <p className="font-semibold text-gold-light">Novo assinante</p>
              <p className="text-xs mt-0.5">Nenhum combo encontrado para "{busca}". Preencha abaixo para ativar.</p>
            </div>

            <form onSubmit={ativarNovoCombo} className="space-y-3">

              {/* Nome (somente leitura) + Contato */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Nome do cliente</label>
                  <input type="text" value={busca} readOnly className="input-dark w-full opacity-60 cursor-default" />
                </div>
                <div>
                  <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Contato / WhatsApp</label>
                  <input
                    type="text" name="cliente_contato" value={comboForm.cliente_contato}
                    onChange={onChangeForm} className="input-dark w-full" placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {/* Data de nascimento + Barbeiro (filtrado pelo login) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Data de nascimento</label>
                  <input type="date" name="data_nascimento" value={comboForm.data_nascimento}
                    onChange={onChangeForm} className="input-dark w-full" />
                </div>
                <div>
                  <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Barbeiro</label>
                  <select name="profissional_id" value={comboForm.profissional_id} onChange={onChangeForm} className="input-dark w-full">
                    <option value="">Qualquer barbeiro</option>
                    {barbeiros.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="h-px bg-surface-border" />

              {/* Plano */}
              <div>
                <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Plano de combo *</label>
                <select name="novo_servico" value={comboForm.novo_servico} onChange={onChangeForm} required className="input-dark w-full">
                  <option value="">Selecione o plano</option>
                  {planos.map(p => (
                    <option key={p.id} value={p.nome}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Valor (R$)</label>
                <input type="number" name="novo_valor" value={comboForm.novo_valor} onChange={onChangeForm}
                  min="0" step="0.01" placeholder="0,00" className="input-dark w-36" />
              </div>

              {/* Pagamento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Pagamento *</label>
                  <select name="forma_pagamento" value={comboForm.forma_pagamento} onChange={onChangeForm} className="input-dark w-full">
                    {FORMAS_PAGAMENTO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                {(comboForm.forma_pagamento === 'credito' || comboForm.forma_pagamento === 'debito') && (
                  <div>
                    <label className="block text-[11px] text-gold-muted uppercase tracking-wider mb-1.5">Bandeira</label>
                    <select name="bandeira_cartao" value={comboForm.bandeira_cartao} onChange={onChangeForm} className="input-dark w-full">
                      <option value="">Selecione...</option>
                      {BANDEIRAS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {comboForm.novo_servico && (
                <div className="text-[10px] text-gold-muted/70 px-1">
                  Vigência: {fmtDataBR(hoje)} → {fmtDataBR(addDias(hoje, 30))} (30 dias)
                </div>
              )}

              <button type="submit" disabled={enviando}
                className="btn-gold w-full justify-center py-2.5 disabled:opacity-50">
                {enviando
                  ? <span className="w-4 h-4 border-2 border-onix/30 border-t-onix rounded-full animate-spin" />
                  : <Tag size={15} />}
                {enviando ? 'Ativando…' : 'Vender e Ativar Combo'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function RegistroVenda({ onIrParaClientes }) {
  const { user } = useAuth();
  const [aba,       setAba]       = useState('venda');
  const [barbeiros, setBarbeiros] = useState([]);
  const [catalogo,  setCatalogo]  = useState([]);

  useEffect(() => {
    if (user?.unidade) {
      api.profissionais({ unidade: user.unidade }).then(setBarbeiros).catch(() => {});
    } else {
      api.profissionais().then(setBarbeiros).catch(() => {});
    }
    const unidade = user?.unidade ?? 'mutinga';
    api.catalogo({ unidade }).then(d => setCatalogo(Array.isArray(d) ? d : [])).catch(() => {});
  }, [user?.unidade]);

  return (
    <main className="max-w-md mx-auto px-4 pb-12 pt-6 animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 border border-gold-dark/40 mb-3 shadow-gold-sm">
          <Scissors size={22} className="text-gold" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif font-bold text-xl text-gold">Registro</h1>
        <p className="text-[11px] text-gold-muted uppercase tracking-widest mt-1">
          Unidade {user?.unidade ?? 'Mutinga'}
        </p>
      </div>

      <div className="flex mb-5 rounded-xl border border-surface-border overflow-hidden">
        {[
          { key: 'venda', label: 'Venda' },
          { key: 'combo', label: 'Combos' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setAba(key)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              aba === key
                ? 'bg-gold text-onix'
                : 'bg-transparent text-gold-muted hover:text-gold'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === 'venda' && <AbaVenda barbeiros={barbeiros} catalogo={catalogo} user={user} onIrParaClientes={onIrParaClientes} />}
      {aba === 'combo' && <AbaCombo barbeiros={barbeiros} catalogo={catalogo} user={user} />}
    </main>
  );
}
