import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ROLE_LABEL = { admin: 'Admin', operador: 'Operador', barbeiro: 'Barbeiro' };
const ROLE_COR   = { admin: 'text-gold', operador: 'text-blue-400', barbeiro: 'text-blue-400' };

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="relative border-b border-surface-border bg-onix-200/80 backdrop-blur-sm">
      {/* Linha dourada topo */}
      <div className="h-0.5 w-full bg-gold-gradient" />

      {/* Nome do usuário + botão sair — canto superior direito */}
      {isAuthenticated && user && (
        <div className="absolute top-3 right-4 flex items-center gap-2.5 z-10">
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-gold-light leading-none">{user.nome}</span>
            <span className={`text-[10px] uppercase tracking-wider font-bold leading-none mt-0.5 ${ROLE_COR[user.role] ?? 'text-gold-muted'}`}>
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gold-muted
                       border border-surface-border rounded-lg
                       hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5
                       transition-all duration-200"
          >
            <LogOut size={13} />
            <span>Sair</span>
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col items-center gap-1">
        {/* BARBEARIA */}
        <div className="gold-divider w-full max-w-xs">
          <span className="text-xs font-serif tracking-[0.35em] text-gold-dark uppercase">
            Barbearia
          </span>
        </div>

        {/* THIECO LEANDRO */}
        <h1 className="font-serif font-black text-3xl sm:text-4xl tracking-widest text-gold-shimmer leading-none">
          Thieco Leandro
        </h1>

        {/* Slogans */}
        <p className="text-gold-light/70 text-xs sm:text-sm font-serif italic tracking-wide text-center mt-1">
          Autoestima Muda Destinos.{' '}
          <span className="text-gold font-semibold not-italic">Confiança Muda Tudo.</span>
        </p>

        {/* Subtítulo sistema */}
        <span className="mt-2 text-[10px] uppercase tracking-[0.3em] text-gold-muted font-sans">
          Sistema de Caixa
        </span>
      </div>

      {/* Linha dourada base */}
      <div className="h-px w-full bg-gold-gradient opacity-40" />
    </header>
  );
}
