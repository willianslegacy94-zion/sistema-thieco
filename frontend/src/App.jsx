import { useState, useRef, useEffect, useCallback } from 'react';
import { SWRConfig } from 'swr';
import { LayoutDashboard, Users, Lock, Brain, Receipt, TrendingUp, Tag, UserRound, Scissors, BarChart2, Trophy, Package, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import GestaoTime from './pages/GestaoTime';
import IntelFinanceira from './pages/IntelFinanceira';
import RegistroVenda from './pages/RegistroVenda';
import RegistroGasto from './pages/RegistroGasto';
import Performance from './pages/Performance';
import Combos from './pages/Combos';
import Clientes from './pages/Clientes';
import RelatorioOperador from './components/RelatorioOperador';
import GestaoMetas from './pages/GestaoMetas';
import MetasIndividuais from './pages/MetasIndividuais';
import MetasUnidade from './pages/MetasUnidade';
import Estoque from './pages/Estoque';
import Lancamentos from './pages/Lancamentos';

// ─── Container de abas com rolagem e setas ───────────────────────────────────

function ScrollableTabs({ children }) {
  const ref = useRef(null);
  const [canLeft, setCanLeft]   = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 0);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener('scroll', update); };
  }, [update]);

  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });

  return (
    <div className="relative flex items-stretch">
      {canLeft && (
        <button
          onClick={() => scroll(-1)}
          aria-label="Rolar para esquerda"
          className="absolute left-0 z-10 h-full px-1.5 flex items-center
                     bg-gradient-to-r from-onix-200 via-onix-200/80 to-transparent
                     text-gold-muted hover:text-gold transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
      )}
      <div ref={ref} className="flex gap-1 overflow-x-auto tabs-scroll">
        {children}
      </div>
      {canRight && (
        <button
          onClick={() => scroll(1)}
          aria-label="Rolar para direita"
          className="absolute right-0 z-10 h-full px-1.5 flex items-center
                     bg-gradient-to-l from-onix-200 via-onix-200/80 to-transparent
                     text-gold-muted hover:text-gold transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}

// ─── Aba de navegação ────────────────────────────────────────────────────────

function NavTab({ pagina, ativa, onClick, disabled }) {
  const Icon = pagina.icon;
  const ativo = ativa === pagina.id;
  return (
    <button
      onClick={() => !disabled && onClick(pagina.id)}
      disabled={disabled}
      title={disabled ? 'Acesso restrito a administradores' : undefined}
      className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap shrink-0 transition-all duration-200
                  ${ativo
                    ? 'border-gold text-gold'
                    : disabled
                      ? 'border-transparent text-gold-muted/30 cursor-not-allowed'
                      : 'border-transparent text-gold-muted hover:text-gold-light hover:border-gold-dark/40'}`}
    >
      <Icon size={15} />
      {pagina.label}
      {pagina.admin && (
        <Lock size={10} className={`${ativo ? 'text-gold' : 'text-gold-muted'} opacity-50`} />
      )}
    </button>
  );
}


// ─── Página de Metas (admin only) — Meta Geral | Por Barbeiro ────────────────

function MetasPage() {
  const [sub, setSub] = useState('geral');
  const SUBS = [
    { id: 'geral',     label: 'Meta Geral'   },
    { id: 'barbeiros', label: 'Por Barbeiro' },
  ];
  return (
    <div>
      <div className="border-b border-surface-border bg-onix-300/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1">
          {SUBS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSub(s.id)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all duration-200
                ${sub === s.id
                  ? 'border-gold text-gold'
                  : 'border-transparent text-gold-muted hover:text-gold-light'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {sub === 'geral'     && <GestaoMetas />}
      {sub === 'barbeiros' && <MetasIndividuais />}
    </div>
  );
}

// ─── App do Operador ─────────────────────────────────────────────────────────

function AppOperador() {
  const [aba, setAba] = useState('registro');

  return (
    <div className="min-h-screen bg-onix-gradient">
      <Header />

      <nav className="border-b border-surface-border bg-onix-200/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollableTabs>
            {[
              { id: 'registro',     label: 'Registro',     icon: Scissors       },
              { id: 'lancamentos',  label: 'Lançamentos',  icon: ClipboardList  },
              { id: 'relatorio',    label: 'Relatório',    icon: BarChart2      },
              { id: 'metas',        label: 'Meta',         icon: Trophy         },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => setAba(p.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap shrink-0 transition-all duration-200
                    ${aba === p.id
                      ? 'border-gold text-gold'
                      : 'border-transparent text-gold-muted hover:text-gold-light hover:border-gold-dark/40'}`}
                >
                  <Icon size={15} />
                  {p.label}
                </button>
              );
            })}
          </ScrollableTabs>
        </div>
      </nav>

      <div className="animate-fade-in" key={aba}>
        {aba === 'registro'    && <RegistroVenda />}
        {aba === 'lancamentos' && <Lancamentos />}
        {aba === 'relatorio'   && <RelatorioOperador />}
        {aba === 'metas'       && <MetasUnidade />}
      </div>
    </div>
  );
}

// ─── App autenticado (Admin / Barbeiro) ──────────────────────────────────────

function AppAutenticado() {
  const { isAdmin, isOperador } = useAuth();
  const [pagina, setPagina] = useState('dashboard');

  if (isOperador) return <AppOperador />;

  const PAGINAS = [
    { id: 'dashboard',    label: 'Dashboard',               icon: LayoutDashboard, admin: false },
    { id: 'performance',  label: 'Performance',              icon: TrendingUp,      admin: false },
    { id: 'registro',     label: 'Registro',                icon: Scissors,        admin: true  },
    { id: 'lancamentos',  label: 'Lançamentos',              icon: ClipboardList,   admin: true  },
    { id: 'inteligencia', label: 'Inteligência Financeira',  icon: Brain,           admin: true  },
    { id: 'despesas',     label: 'Despesas',                 icon: Receipt,         admin: true  },
    { id: 'combos',       label: 'Combos',                   icon: Tag,             admin: true  },
    { id: 'clientes',     label: 'Clientes',                 icon: UserRound,       admin: true  },
    { id: 'gestao',       label: 'Gestão de Time',           icon: Users,           admin: true  },
    { id: 'metas',        label: 'Metas',                    icon: Trophy,          admin: true  },
    { id: 'estoque',      label: 'Estoque',                  icon: Package,         admin: true  },
  ];

  const paginaAtual = !isAdmin && PAGINAS.find((p) => p.id === pagina)?.admin
    ? 'dashboard'
    : pagina;

  return (
    <div className="min-h-screen bg-onix-gradient">
      <Header />

      <nav className="border-b border-surface-border bg-onix-200/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollableTabs>
            {PAGINAS.map((p) => (
              <NavTab
                key={p.id}
                pagina={p}
                ativa={paginaAtual}
                onClick={setPagina}
                disabled={p.admin && !isAdmin}
              />
            ))}
          </ScrollableTabs>
        </div>
      </nav>

      <div className="animate-fade-in" key={paginaAtual}>
        {paginaAtual === 'dashboard'    && <Dashboard />}
        {paginaAtual === 'performance'  && <Performance />}
        {paginaAtual === 'registro'     && isAdmin && <RegistroVenda onIrParaClientes={() => setPagina('clientes')} />}
        {paginaAtual === 'lancamentos'  && isAdmin && <Lancamentos />}
        {paginaAtual === 'inteligencia' && isAdmin && <IntelFinanceira />}
        {paginaAtual === 'despesas'     && isAdmin && <RegistroGasto />}
        {paginaAtual === 'combos'       && isAdmin && <Combos />}
        {paginaAtual === 'clientes'     && isAdmin && <Clientes />}
        {paginaAtual === 'gestao'       && isAdmin && <GestaoTime />}
        {paginaAtual === 'metas'        && isAdmin && <MetasPage />}
        {paginaAtual === 'estoque'      && isAdmin && <Estoque />}
      </div>
    </div>
  );
}

// ─── Raiz: Auth gate ─────────────────────────────────────────────────────────

function AppRoot() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppAutenticado /> : <Login />;
}

export default function App() {
  return (
    <SWRConfig value={{ revalidateOnMount: true }}>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </SWRConfig>
  );
}
