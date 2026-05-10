import { useState, useEffect, useCallback } from 'react';
import { Trophy, Award, RefreshCw, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function formatBRL(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const NIVEL_CONFIG = {
  ouro:   { label: 'Ouro',   cor: 'text-gold',       bg: 'bg-gold/10',       borda: 'border-gold-dark/50',   fill: '#C8A951' },
  prata:  { label: 'Prata',  cor: 'text-slate-300',   bg: 'bg-slate-700/20',  borda: 'border-slate-500/40',   fill: '#94A3B8' },
  bronze: { label: 'Bronze', cor: 'text-amber-500',   bg: 'bg-amber-900/15',  borda: 'border-amber-700/40',   fill: '#F59E0B' },
  null:   { label: 'Sem nível', cor: 'text-gold-muted', bg: 'bg-surface/30', borda: 'border-surface-border', fill: '#4B5563' },
};

function Termometro({ realizado, meta }) {
  if (!meta) return null;

  const { piso_bronze, piso_prata, piso_ouro, valor_global } = meta;
  const teto = Math.max(Number(valor_global || 0), Number(piso_ouro || 0)) * 1.05;
  const pct  = v => Math.min(100, (Number(v || 0) / teto) * 100);

  const realizadoPct = pct(realizado);

  const markers = [
    piso_bronze && { val: Number(piso_bronze), label: 'Bronze', cor: '#F59E0B' },
    piso_prata  && { val: Number(piso_prata),  label: 'Prata',  cor: '#94A3B8' },
    piso_ouro   && { val: Number(piso_ouro),   label: 'Ouro',   cor: '#C8A951' },
  ].filter(Boolean);

  return (
    <div className="mt-6">
      <div className="relative h-8 rounded-full overflow-hidden bg-onix-300/60 border border-surface-border">
        {/* Zonas coloridas */}
        {markers.map((m, i) => {
          const from = i === 0 ? 0 : pct(markers[i - 1].val);
          const to   = pct(m.val);
          return (
            <div
              key={m.label}
              className="absolute top-0 h-full opacity-20 rounded-full"
              style={{ left: `${from}%`, width: `${to - from}%`, background: m.cor }}
            />
          );
        })}

        {/* Barra de progresso */}
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
          style={{
            width: `${realizadoPct}%`,
            background: 'linear-gradient(90deg, #8B6914 0%, #C8A951 60%, #FFD700 100%)',
            boxShadow: '0 0 10px rgba(200,169,81,0.4)',
          }}
        />

        {/* Marcadores */}
        {markers.map((m) => (
          <div
            key={m.label}
            className="absolute top-0 h-full flex items-center"
            style={{ left: `${pct(m.val)}%` }}
          >
            <div className="w-px h-full bg-white/30" />
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex justify-between mt-2 text-[10px] text-gold-muted">
        <span>R$ 0</span>
        {markers.map(m => (
          <span key={m.label} style={{ color: m.cor }}>
            {m.label} ({formatBRL(m.val)})
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MetasUnidade() {
  const { user, isAdmin } = useAuth();
  const now = new Date();

  const [mes,      setMes]      = useState(now.getMonth() + 1);
  const [ano,      setAno]      = useState(now.getFullYear());
  const [unidade,  setUnidade]  = useState(user?.unidade ?? 'mutinga');
  const [dados,    setDados]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [erro,     setErro]     = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const params = { mes, ano };
      if (isAdmin) params.unidade = unidade;
      const res = await api.progressoMetaUnidade(params);
      setDados(res);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }, [mes, ano, unidade, isAdmin]);

  useEffect(() => { carregar(); }, [carregar]);

  const nivelCfg = NIVEL_CONFIG[dados?.nivel ?? 'null'];
  const proximoCfg = dados?.proximo_nivel ? NIVEL_CONFIG[dados.proximo_nivel] : null;

  const semMeta = dados && !dados.meta;
  const realizadoPct = dados?.meta
    ? Math.min(100, (dados.realizado / (Math.max(Number(dados.meta.valor_global || 0), Number(dados.meta.piso_ouro || 0)) * 1.05)) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Cabeçalho */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold-dark/30 flex items-center justify-center">
          <Trophy size={16} className="text-gold" />
        </div>
        <div>
          <h1 className="font-serif font-bold text-xl text-gold">Metas da Equipe</h1>
          <p className="text-xs text-gold-muted">Progresso coletivo da unidade</p>
        </div>
      </div>

      {/* Filtros (admin vê filtro de unidade/mês; operador vê só mês) */}
      <div className="card-premium border border-surface-border p-4 mb-5">
        <div className={`grid gap-3 ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {isAdmin && (
            <div>
              <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">Unidade</label>
              <select className="input-dark w-full" value={unidade} onChange={e => setUnidade(e.target.value)}>
                <option value="tambore">Tamboré</option>
                <option value="mutinga">Mutinga</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">Mês</label>
            <select className="input-dark w-full" value={mes} onChange={e => setMes(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">Ano</label>
            <input
              type="number"
              className="input-dark w-full"
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
              min={2024} max={2030}
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
          Atualizar
        </button>
      </div>

      {erro && (
        <p className="text-red-400 text-xs text-center py-2 px-3 rounded-lg bg-red-900/20 border border-red-800/30 mb-4">
          {erro}
        </p>
      )}

      {loading && (
        <div className="card-premium border border-surface-border p-8 text-center">
          <RefreshCw size={20} className="animate-spin text-gold mx-auto mb-2" />
          <p className="text-xs text-gold-muted">Carregando...</p>
        </div>
      )}

      {!loading && semMeta && (
        <div className="card-premium border border-surface-border p-8 text-center">
          <Trophy size={28} className="text-gold-muted/30 mx-auto mb-3" />
          <p className="text-sm text-gold-muted">Nenhuma meta configurada para este período.</p>
          {isAdmin && (
            <p className="text-xs text-gold-muted/60 mt-1">
              Configure na aba "Gestão de Metas".
            </p>
          )}
        </div>
      )}

      {!loading && dados?.meta && (
        <>
          {/* Card principal: valor realizado */}
          <div className="card-premium border border-surface-border p-7 mb-4 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-gold-muted mb-3">
              {MESES[dados.mes - 1]} {dados.ano} · {dados.unidade.charAt(0).toUpperCase() + dados.unidade.slice(1)}
            </p>

            <p className="text-sm text-gold-light/70 mb-1">Nós já atingimos</p>
            <p className="font-serif font-black text-4xl text-gold-shimmer leading-none mb-1">
              {formatBRL(dados.realizado)}
            </p>
            <p className="text-xs text-gold-muted/60 mt-2">
              Meta: {formatBRL(dados.meta.valor_global)}
              &nbsp;·&nbsp;
              {realizadoPct.toFixed(0)}% alcançado
            </p>

            <Termometro realizado={dados.realizado} meta={dados.meta} />
          </div>

          {/* Tabela de categorias */}
          {(dados.meta.piso_bronze || dados.meta.piso_prata || dados.meta.piso_ouro) && (
            <div className="card-premium border border-surface-border p-5 mb-4">
              <p className="text-xs uppercase tracking-wider text-gold-muted mb-3">Categorias da Meta</p>
              <div className="space-y-2">
                {[
                  { key: 'bronze', label: 'Bronze', cor: 'text-amber-500', bg: 'bg-amber-900/10', borda: 'border-amber-700/30' },
                  { key: 'prata',  label: 'Prata',  cor: 'text-slate-300', bg: 'bg-slate-700/10', borda: 'border-slate-500/30' },
                  { key: 'ouro',   label: 'Ouro',   cor: 'text-gold',      bg: 'bg-gold/5',       borda: 'border-gold-dark/30' },
                ].map(n => {
                  const piso      = dados.meta[`piso_${n.key}`];
                  const comissao  = dados.meta[`comissao_${n.key}`];
                  const atingido  = dados.nivel === n.key || (dados.nivel === 'ouro' && n.key !== 'ouro') || (dados.nivel === 'prata' && n.key === 'bronze');
                  if (!piso) return null;
                  return (
                    <div key={n.key} className={`flex items-center justify-between rounded-lg px-4 py-2.5 border ${n.borda} ${n.bg} ${atingido ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-2.5">
                        <Award size={14} className={n.cor} />
                        <span className={`text-sm font-bold ${n.cor}`}>{n.label}</span>
                        {atingido && <span className="text-[9px] uppercase tracking-wider text-gold-muted/50">✓ atingido</span>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gold-light">a partir de {formatBRL(piso)}</p>
                        {comissao && (
                          <p className={`text-xs font-bold ${n.cor}`}>{comissao}% de comissão</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nível atual */}
          <div className={`card-premium border ${nivelCfg.borda} ${nivelCfg.bg} p-5 mb-4 flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-full ${nivelCfg.bg} border ${nivelCfg.borda} flex items-center justify-center shrink-0`}>
              <Award size={22} className={nivelCfg.cor} />
            </div>
            <div className="flex-1">
              {dados.nivel ? (
                <>
                  <p className="text-xs text-gold-muted uppercase tracking-wider">Nível atual</p>
                  <p className={`font-serif font-bold text-xl ${nivelCfg.cor} leading-tight`}>
                    {nivelCfg.label}
                  </p>
                  <p className="text-xs text-gold-muted/80 mt-0.5">
                    Nós estamos no nível{' '}
                    <span className={`font-bold ${nivelCfg.cor}`}>{nivelCfg.label}</span>
                    {dados.comissao_atual > 0 && (
                      <> — Comissão de <span className={`font-bold ${nivelCfg.cor}`}>{dados.comissao_atual}%</span></>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gold-muted uppercase tracking-wider">Nível atual</p>
                  <p className="font-serif font-bold text-lg text-gold-muted leading-tight">Ainda sem nível</p>
                  <p className="text-xs text-gold-muted/60 mt-0.5">Continue! Vocês estão chegando lá!</p>
                </>
              )}
            </div>
          </div>

          {/* Próximo nível */}
          {dados.proximo_nivel && dados.falta_proximo !== null && (
            <div className="card-premium border border-surface-border p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gold/5 border border-gold-dark/20 flex items-center justify-center shrink-0">
                <TrendingUp size={16} className="text-gold" />
              </div>
              <div>
                <p className="text-xs text-gold-muted uppercase tracking-wider">Próximo objetivo</p>
                <p className="text-sm font-semibold text-gold-light mt-0.5">
                  Faltam apenas{' '}
                  <span className="font-bold text-gold">{formatBRL(dados.falta_proximo)}</span>{' '}
                  para desbloquearmos o nível{' '}
                  <span className={`font-bold ${proximoCfg?.cor ?? 'text-gold'}`}>
                    {NIVEL_CONFIG[dados.proximo_nivel]?.label}
                  </span>
                  !
                </p>
                {proximoCfg && (
                  <p className="text-xs text-gold-muted/60 mt-0.5">
                    Comissão de {dados.meta[`comissao_${dados.proximo_nivel}`]}% ao atingir {formatBRL(dados.meta[`piso_${dados.proximo_nivel}`])}
                  </p>
                )}
              </div>
            </div>
          )}

          {dados.nivel === 'ouro' && (
            <div className="card-premium border border-gold-dark/50 bg-gold/5 p-5 text-center">
              <p className="font-serif font-bold text-lg text-gold">Parabéns! Nível Ouro atingido!</p>
              <p className="text-xs text-gold-muted mt-1">Vocês conquistaram o máximo. Excelente trabalho!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
