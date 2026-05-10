import { useState, useEffect, useCallback } from 'react';
import { Save, Trophy, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

const UNIDADES = ['tambore', 'mutinga'];
const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function formatBRL(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const EMPTY = {
  valor_global: '',
  piso_bronze: '', comissao_bronze: '',
  piso_prata:  '', comissao_prata:  '',
  piso_ouro:   '', comissao_ouro:   '',
};

export default function GestaoMetas() {
  const now = new Date();
  const [unidade,   setUnidade]   = useState('tambore');
  const [mes,       setMes]       = useState(now.getMonth() + 1);
  const [ano,       setAno]       = useState(now.getFullYear());
  const [form,      setForm]      = useState(EMPTY);
  const [loading,   setLoading]   = useState(false);
  const [salvando,  setSalvando]  = useState(false);
  const [sucesso,   setSucesso]   = useState(false);
  const [erro,      setErro]      = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const rows = await api.metasUnidade({ unidade, mes, ano });
      if (rows.length > 0) {
        const m = rows[0];
        setForm({
          valor_global:    m.valor_global    ?? '',
          piso_bronze:     m.piso_bronze     ?? '',
          comissao_bronze: m.comissao_bronze ?? '',
          piso_prata:      m.piso_prata      ?? '',
          comissao_prata:  m.comissao_prata  ?? '',
          piso_ouro:       m.piso_ouro       ?? '',
          comissao_ouro:   m.comissao_ouro   ?? '',
        });
      } else {
        setForm(EMPTY);
      }
    } catch {
      setErro('Erro ao carregar configuração.');
    } finally {
      setLoading(false);
    }
  }, [unidade, mes, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvar(e) {
    e.preventDefault();
    if (!form.valor_global) { setErro('Meta global é obrigatória.'); return; }
    setSalvando(true);
    setErro('');
    setSucesso(false);
    try {
      await api.criarMetaUnidade({
        unidade, mes, ano,
        valor_global:    Number(form.valor_global),
        piso_bronze:     form.piso_bronze     ? Number(form.piso_bronze)     : null,
        comissao_bronze: form.comissao_bronze ? Number(form.comissao_bronze) : null,
        piso_prata:      form.piso_prata      ? Number(form.piso_prata)      : null,
        comissao_prata:  form.comissao_prata  ? Number(form.comissao_prata)  : null,
        piso_ouro:       form.piso_ouro       ? Number(form.piso_ouro)       : null,
        comissao_ouro:   form.comissao_ouro   ? Number(form.comissao_ouro)   : null,
      });
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  const NIVEIS = [
    { key: 'bronze', label: 'Bronze', cor: 'text-amber-500',  borda: 'border-amber-700/40',  bg: 'bg-amber-900/10' },
    { key: 'prata',  label: 'Prata',  cor: 'text-slate-300',  borda: 'border-slate-500/40',  bg: 'bg-slate-700/10' },
    { key: 'ouro',   label: 'Ouro',   cor: 'text-gold',       borda: 'border-gold-dark/40',  bg: 'bg-gold/5'       },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold-dark/30 flex items-center justify-center">
          <Trophy size={16} className="text-gold" />
        </div>
        <div>
          <h1 className="font-serif font-bold text-xl text-gold">Gestão de Metas</h1>
          <p className="text-xs text-gold-muted">Configure os patamares de comissão coletiva por unidade</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card-premium border border-surface-border p-4 mb-5">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">Unidade</label>
            <select
              className="input-dark w-full"
              value={unidade}
              onChange={e => setUnidade(e.target.value)}
            >
              {UNIDADES.map(u => (
                <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">Mês</label>
            <select
              className="input-dark w-full"
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
            >
              {MESES.map((m, i) => (
                <option key={i+1} value={i+1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">Ano</label>
            <input
              type="number"
              className="input-dark w-full"
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
              min={2024}
              max={2030}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={carregar}
          disabled={loading}
          className="mt-3 flex items-center gap-1.5 text-xs text-gold-muted hover:text-gold transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Recarregar
        </button>
      </div>

      {/* Formulário */}
      <form onSubmit={salvar} className="space-y-4">
        {/* Meta global */}
        <div className="card-premium border border-surface-border p-5">
          <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">
            Meta Global do Mês (R$)
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            className="input-dark w-full"
            placeholder="Ex.: 30000"
            value={form.valor_global}
            onChange={e => set('valor_global', e.target.value)}
          />
          <p className="mt-1.5 text-[10px] text-gold-muted/60">
            Objetivo total de faturamento da unidade no período
          </p>
        </div>

        {/* Patamares */}
        {NIVEIS.map(n => (
          <div key={n.key} className={`card-premium border ${n.borda} ${n.bg} p-5`}>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-sm font-bold font-serif ${n.cor}`}>Nível {n.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">
                  Piso (R$)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input-dark w-full"
                  placeholder="Ex.: 20000"
                  value={form[`piso_${n.key}`]}
                  onChange={e => set(`piso_${n.key}`, e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">
                  Comissão (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  className="input-dark w-full"
                  placeholder="Ex.: 5"
                  value={form[`comissao_${n.key}`]}
                  onChange={e => set(`comissao_${n.key}`, e.target.value)}
                />
              </div>
            </div>
            {form[`piso_${n.key}`] && form[`comissao_${n.key}`] && (
              <p className="mt-2 text-[11px] text-gold-muted/70">
                A partir de {formatBRL(form[`piso_${n.key}`])} → {form[`comissao_${n.key}`]}% de comissão
              </p>
            )}
          </div>
        ))}

        {erro && (
          <p className="text-red-400 text-xs text-center py-2 px-3 rounded-lg bg-red-900/20 border border-red-800/30">
            {erro}
          </p>
        )}
        {sucesso && (
          <p className="text-green-400 text-xs text-center py-2 px-3 rounded-lg bg-green-900/20 border border-green-800/30">
            Meta salva com sucesso!
          </p>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="btn-gold w-full justify-center"
        >
          <Save size={14} />
          {salvando ? 'Salvando...' : 'Salvar Meta'}
        </button>
      </form>
    </div>
  );
}
