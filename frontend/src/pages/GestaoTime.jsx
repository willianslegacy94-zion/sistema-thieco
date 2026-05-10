import { useState, useEffect } from 'react';
import { Users, Star, ClipboardList, Lightbulb, GitBranch, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGestao } from '../hooks/useGestao';
import FeedbackForm from '../components/gestao/FeedbackForm';
import FeedbackList from '../components/gestao/FeedbackList';
import PdcaForm from '../components/gestao/PdcaForm';
import PdcaCard from '../components/gestao/PdcaCard';
import SugestaoForm from '../components/gestao/SugestaoForm';
import SugestaoList from '../components/gestao/SugestaoList';
import TimelineBarbeiro from '../components/gestao/TimelineBarbeiro';

const TABS = [
  { id: 'feedbacks', label: 'Feedbacks',      icon: Star },
  { id: 'pdca',      label: 'Planos de Ação',  icon: ClipboardList },
  { id: 'sugestoes', label: 'Sugestões',        icon: Lightbulb },
  { id: 'timeline',  label: 'Timeline',          icon: GitBranch },
];

export default function GestaoTime() {
  const { user, logout } = useAuth();
  const [abaAtiva,     setAbaAtiva]     = useState('feedbacks');
  const [profTimeline, setProfTimeline] = useState(null);

  const {
    profissionais, carregarProfissionais,
    feedbacks, carregarFeedbacks, criarFeedback, deletarFeedback,
    pdcaLista, carregarPdca, criarPdca, atualizarPdca, deletarPdca,
    sugestoes, carregarSugestoes, criarSugestao, atualizarSugestao,
    timeline,  carregarTimeline,
    loading,
  } = useGestao();

  useEffect(() => { carregarProfissionais(); }, [carregarProfissionais]);

  useEffect(() => {
    if (abaAtiva === 'feedbacks') carregarFeedbacks();
    if (abaAtiva === 'pdca')      carregarPdca();
    if (abaAtiva === 'sugestoes') carregarSugestoes();
    if (abaAtiva === 'timeline' && profTimeline) carregarTimeline(profTimeline);
  }, [abaAtiva]);

  function selecionarProfTimeline(id) {
    setProfTimeline(id);
    carregarTimeline(id);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between py-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold-dark/40 flex items-center justify-center">
            <Users size={16} className="text-gold" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-lg text-gold leading-none">Gestão de Time</h2>
            <p className="text-xs text-gold-muted mt-0.5">Admin — {user?.nome}</p>
          </div>
        </div>
        <button onClick={logout} className="btn-outline-gold text-xs px-3 py-1.5">
          <LogOut size={12} />
          Sair
        </button>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-surface-card rounded-xl p-1 border border-surface-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const ativo = abaAtiva === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setAbaAtiva(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold
                          transition-all duration-200
                          ${ativo ? 'bg-gold-gradient text-onix-300 shadow-gold-sm' : 'text-gold-muted hover:text-gold-light'}`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Feedbacks ─────────────────────────────────────────────────────────── */}
      {abaAtiva === 'feedbacks' && (
        <div className="space-y-5">
          <FeedbackForm profissionais={profissionais} onSalvar={criarFeedback} loading={loading.feedbackSave} />
          <FeedbackList feedbacks={feedbacks} profissionais={profissionais} onDeletar={deletarFeedback} onFiltrar={carregarFeedbacks} loading={loading.feedbacks} />
        </div>
      )}

      {/* ── PDCA ──────────────────────────────────────────────────────────────── */}
      {abaAtiva === 'pdca' && (
        <div className="space-y-5">
          <PdcaForm profissionais={profissionais} onSalvar={criarPdca} loading={loading.pdcaSave} />
          <div className="card-premium p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-gold-muted">Planos Ativos</h3>
              <div className="flex gap-2">
                {profissionais.map((p) => (
                  <button key={p.id} onClick={() => carregarPdca({ profissional_id: p.id })} className="btn-outline-gold text-xs px-2 py-1">
                    {p.nome.split(' ')[0]}
                  </button>
                ))}
                <button onClick={() => carregarPdca()} className="btn-outline-gold text-xs px-2 py-1">Todos</button>
              </div>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-gold-dark/30 to-transparent mb-4" />
            {loading.pdca
              ? [1,2].map((i) => <div key={i} className="h-16 bg-surface-hover rounded-xl animate-pulse mb-3" />)
              : pdcaLista.length === 0
                ? <p className="text-center text-gold-muted py-8 text-sm">Nenhum plano criado.</p>
                : <div className="space-y-3">{pdcaLista.map((p) => <PdcaCard key={p.id} pdca={p} onAtualizar={atualizarPdca} onDeletar={deletarPdca} />)}</div>
            }
          </div>
        </div>
      )}

      {/* ── Sugestões ─────────────────────────────────────────────────────────── */}
      {abaAtiva === 'sugestoes' && (
        <div className="space-y-5">
          <SugestaoForm onSalvar={criarSugestao} loading={loading.sugestaoSave} />
          <div className="card-premium p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-gold-muted">Sugestões Registradas</h3>
              <div className="flex gap-2">
                {['geral', 'tambore', 'mutinga'].map((u) => (
                  <button key={u} onClick={() => carregarSugestoes(u === 'geral' ? {} : { unidade: u })} className="btn-outline-gold text-xs px-2 py-1 capitalize">
                    {u === 'geral' ? 'Todas' : u === 'tambore' ? 'Tamboré' : 'Mutinga'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-gold-dark/30 to-transparent mb-4" />
            <SugestaoList sugestoes={sugestoes} onAtualizar={atualizarSugestao} loading={loading.sugestoes} />
          </div>
        </div>
      )}

      {/* ── Timeline ──────────────────────────────────────────────────────────── */}
      {abaAtiva === 'timeline' && (
        <TimelineBarbeiro
          profissionais={profissionais}
          profissionalSelecionado={profTimeline}
          onSelecionar={selecionarProfTimeline}
          timeline={timeline}
          loading={loading.timeline}
        />
      )}
    </div>
  );
}
