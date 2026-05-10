import { useState, useEffect, useCallback } from 'react';
import { Trophy, Award, ChevronDown, ChevronUp, Save, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const TIPOS = [
  { value: 'faturamento',  label: 'Faturamento (R$)' },
  { value: 'atendimentos', label: 'Atendimentos (qtd)' },
  { value: 'ticket_medio', label: 'Ticket Médio (R$)'  },
];

const NIVEL_COR = {
  ouro:   { label: 'Ouro',   cor: 'text-gold',      bg: 'bg-gold/10',      borda: 'border-gold-dark/40'   },
  prata:  { label: 'Prata',  cor: 'text-slate-300',  bg: 'bg-slate-700/10', borda: 'border-slate-500/30'   },
  bronze: { label: 'Bronze', cor: 'text-amber-500',  bg: 'bg-amber-900/10', borda: 'border-amber-700/30'   },
  abaixo: { label: 'Abaixo da meta', cor: 'text-red-400', bg: 'bg-red-900/10', borda: 'border-red-800/30'  },
};

function fmt(v, tipo) {
  if (tipo === 'atendimentos') return Number(v ?? 0);
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function BarraMeta({ realizado, bronze, prata, ouro }) {
  const teto = Math.max(Number(ouro ?? 0), Number(realizado ?? 0)) * 1.1 || 1;
  const pct  = (v) => Math.min(100, (Number(v ?? 0) / teto) * 100);
  return (
    <div className="mt-3">
      <div className="relative h-3 rounded-full overflow-hidden bg-onix-300/60 border border-surface-border">
        {bronze && <div className="absolute top-0 h-full opacity-20 rounded-full" style={{ left: 0, width: `${pct(bronze)}%`, background: '#F59E0B' }} />}
        {prata  && <div className="absolute top-0 h-full opacity-20 rounded-full" style={{ left: `${pct(bronze??0)}%`, width: `${pct(prata) - pct(bronze??0)}%`, background: '#94A3B8' }} />}
        {ouro   && <div className="absolute top-0 h-full opacity-20 rounded-full" style={{ left: `${pct(prata??0)}%`, width: `${pct(ouro) - pct(prata??0)}%`, background: '#C8A951' }} />}
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct(realizado)}%`,
            background: 'linear-gradient(90deg, #8B6914, #C8A951)',
          }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-gold-muted/60 mt-1">
        <span>0</span>
        {bronze && <span className="text-amber-600">{fmt(bronze, 'faturamento')}</span>}
        {prata  && <span className="text-slate-400">{fmt(prata, 'faturamento')}</span>}
        {ouro   && <span className="text-gold-muted">{fmt(ouro, 'faturamento')}</span>}
      </div>
    </div>
  );
}

const FORM_EMPTY = {
  tipo: 'faturamento',
  meta_bronze: '', bonificacao_bronze: '',
  meta_prata:  '', bonificacao_prata:  '',
  meta_ouro:   '', bonificacao_ouro:   '',
};

function FormMeta({ barbeiro, periodo, onSalvo }) {
  const [form,     setForm]     = useState(FORM_EMPTY);
  const [salvando, setSalvando] = useState(false);
  const [erro,     setErro]     = useState('');

  useEffect(() => {
    if (barbeiro?.meta) {
      const m = barbeiro.meta;
      setForm({
        tipo:               m.tipo              ?? 'faturamento',
        meta_bronze:        m.meta_bronze       ?? '',
        bonificacao_bronze: m.bonificacao_bronze ?? '',
        meta_prata:         m.meta_prata        ?? '',
        bonificacao_prata:  m.bonificacao_prata  ?? '',
        meta_ouro:          m.meta_ouro         ?? '',
        bonificacao_ouro:   m.bonificacao_ouro   ?? '',
      });
    } else {
      setForm(FORM_EMPTY);
    }
  }, [barbeiro]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      await api.criarMeta({
        profissional_id:    barbeiro.profissional_id,
        tipo:               form.tipo,
        periodo,
        meta_bronze:        form.meta_bronze        ? Number(form.meta_bronze)        : null,
        bonificacao_bronze: form.bonificacao_bronze ? Number(form.bonificacao_bronze) : null,
        meta_prata:         form.meta_prata         ? Number(form.meta_prata)         : null,
        bonificacao_prata:  form.bonificacao_prata  ? Number(form.bonificacao_prata)  : null,
        meta_ouro:          form.meta_ouro          ? Number(form.meta_ouro)          : null,
        bonificacao_ouro:   form.bonificacao_ouro   ? Number(form.bonificacao_ouro)   : null,
      });
      onSalvo();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  const NIVEIS = [
    { key: 'bronze', label: 'Bronze', cor: 'text-amber-500' },
    { key: 'prata',  label: 'Prata',  cor: 'text-slate-300' },
    { key: 'ouro',   label: 'Ouro',   cor: 'text-gold'      },
  ];

  return (
    <form onSubmit={salvar} className="mt-4 space-y-4 border-t border-surface-border pt-4">
      <div>
        <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">Tipo de Meta</label>
        <select className="input-dark w-full" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {NIVEIS.map(n => (
        <div key={n.key} className="grid grid-cols-2 gap-3">
          <div>
            <label className={`block text-xs uppercase tracking-wider mb-1.5 ${n.cor}`}>
              {n.label} — Meta ({TIPOS.find(t => t.value === form.tipo)?.label})
            </label>
            <input
              type="number" min={0} step={0.01}
              className="input-dark w-full"
              placeholder="Ex.: 8000"
              value={form[`meta_${n.key}`]}
              onChange={e => set(`meta_${n.key}`, e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">
              Bonificação (R$)
            </label>
            <input
              type="number" min={0} step={0.01}
              className="input-dark w-full"
              placeholder="Ex.: 200"
              value={form[`bonificacao_${n.key}`]}
              onChange={e => set(`bonificacao_${n.key}`, e.target.value)}
            />
          </div>
        </div>
      ))}

      {erro && (
        <p className="text-red-400 text-xs py-1.5 px-3 rounded-lg bg-red-900/20 border border-red-800/30">
          {erro}
        </p>
      )}

      <button type="submit" disabled={salvando} className="btn-gold w-full justify-center">
        <Save size={13} />
        {salvando ? 'Salvando...' : 'Salvar Meta'}
      </button>
    </form>
  );
}

function CardBarbeiro({ barbeiro, periodo, onSalvo }) {
  const [aberto, setAberto] = useState(false);
  const nivel = barbeiro.nivel;
  const cfg   = NIVEL_COR[nivel] ?? null;
  const r     = barbeiro.realizado;
  const m     = barbeiro.meta;
  const tipo  = m?.tipo ?? 'faturamento';

  return (
    <div className="card-premium border border-surface-border overflow-hidden">
      {/* Cabeçalho */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold-dark/30 flex items-center justify-center shrink-0">
          <Award size={18} className="text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gold-light text-sm">{barbeiro.nome}</p>
          {nivel && cfg ? (
            <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.cor}`}>
              Nível {cfg.label}
            </span>
          ) : m ? (
            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Abaixo da meta</span>
          ) : (
            <span className="text-[10px] text-gold-muted/50 uppercase tracking-wider">Sem meta</span>
          )}
        </div>
        {r && m && (
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-gold">{fmt(r[tipo], tipo)}</p>
            <p className="text-[10px] text-gold-muted/60">realizado</p>
          </div>
        )}
        <button
          onClick={() => setAberto(v => !v)}
          className="ml-1 text-gold-muted hover:text-gold transition-colors"
        >
          {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Barra de progresso rápida */}
      {r && m && (
        <div className="px-4 pb-3">
          <BarraMeta
            realizado={r[tipo]}
            bronze={m.meta_bronze}
            prata={m.meta_prata}
            ouro={m.meta_ouro}
          />
          <div className="flex gap-3 mt-2 text-[10px] text-gold-muted/70">
            {m.meta_bronze && <span>Bronze: {fmt(m.meta_bronze, tipo)}</span>}
            {m.meta_prata  && <span>Prata: {fmt(m.meta_prata, tipo)}</span>}
            {m.meta_ouro   && <span>Ouro: {fmt(m.meta_ouro, tipo)}</span>}
          </div>
        </div>
      )}

      {/* Form expansível */}
      {aberto && (
        <div className="px-4 pb-4">
          <FormMeta barbeiro={barbeiro} periodo={periodo} onSalvo={() => { setAberto(false); onSalvo(); }} />
        </div>
      )}
    </div>
  );
}

export default function MetasIndividuais() {
  const now = new Date();
  const [mes,        setMes]        = useState(now.getMonth() + 1);
  const [ano,        setAno]        = useState(now.getFullYear());
  const [barbeiros,  setBarbeiros]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [erro,       setErro]       = useState('');

  const periodo = `${ano}-${String(mes).padStart(2, '0')}`;

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      // Busca todos os barbeiros ativos E o status de metas em paralelo
      const [profsRes, statusRes] = await Promise.all([
        api.profissionais({ apenas_barbeiros: true }),
        api.statusMetas({ periodo }).catch(() => ({ status: [] })),
      ]);

      const profs  = Array.isArray(profsRes) ? profsRes : [];
      const status = statusRes.status ?? [];

      // Mescla: todos os barbeiros aparecem, mesmo sem vendas no período
      const merged = profs.map(p => {
        const found = status.find(s => s.profissional_id === p.id);
        return found ?? {
          profissional_id: p.id,
          nome:            p.nome,
          realizado:       null,
          meta:            null,
          nivel:           null,
        };
      });

      setBarbeiros(merged);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold-dark/30 flex items-center justify-center">
          <Trophy size={16} className="text-gold" />
        </div>
        <div>
          <h1 className="font-serif font-bold text-xl text-gold">Metas Individuais</h1>
          <p className="text-xs text-gold-muted">Configure e acompanhe as metas dos barbeiros</p>
        </div>
      </div>

      {/* Período */}
      <div className="card-premium border border-surface-border p-4 mb-5">
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">Mês</label>
            <select className="input-dark w-full" value={mes} onChange={e => setMes(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">Ano</label>
            <input type="number" className="input-dark w-full" value={ano} onChange={e => setAno(Number(e.target.value))} min={2024} max={2030} />
          </div>
          <button
            type="button"
            onClick={carregar}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 text-xs text-gold-muted hover:text-gold transition-colors h-[38px]"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {erro && (
        <p className="text-red-400 text-xs text-center py-2 px-3 rounded-lg bg-red-900/20 border border-red-800/30 mb-4">
          {erro}
        </p>
      )}

      {loading && (
        <div className="text-center py-8">
          <RefreshCw size={20} className="animate-spin text-gold mx-auto mb-2" />
          <p className="text-xs text-gold-muted">Carregando...</p>
        </div>
      )}

      {!loading && barbeiros.length === 0 && (
        <div className="card-premium border border-surface-border p-8 text-center">
          <p className="text-sm text-gold-muted">Nenhum barbeiro ativo encontrado.</p>
        </div>
      )}

      {!loading && barbeiros.length > 0 && (
        <div className="space-y-3">
          {barbeiros.map(b => (
            <CardBarbeiro key={b.profissional_id} barbeiro={b} periodo={periodo} onSalvo={carregar} />
          ))}
        </div>
      )}
    </div>
  );
}
