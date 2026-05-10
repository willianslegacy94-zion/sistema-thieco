import { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function AdminGate({ onUnlock }) {
  const [pin,     setPin]     = useState('');
  const [visivel, setVisivel] = useState(false);
  const [erro,    setErro]    = useState(false);
  const [shake,   setShake]   = useState(false);

  function tentar() {
    // Validação feita no backend — apenas testa se tem 4+ dígitos antes de enviar
    if (pin.length < 4) { triggerErro(); return; }
    onUnlock(pin);
  }

  function triggerErro() {
    setErro(true);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setTimeout(() => setErro(false), 2000);
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div
        className={`card-premium border border-surface-border p-8 w-full max-w-sm text-center
                    transition-all duration-200 ${shake ? 'translate-x-1' : ''}`}
        style={{ animation: shake ? 'shake 0.4s ease' : 'none' }}
      >
        {/* Ícone */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold-dark/40 flex items-center justify-center animate-pulse-gold">
            <Lock size={28} className="text-gold" strokeWidth={1.5} />
          </div>
        </div>

        {/* Título */}
        <h2 className="font-serif font-bold text-xl text-gold mb-1">Acesso Restrito</h2>
        <p className="text-xs text-gold-muted uppercase tracking-widest mb-6">
          Módulo Gestão de Time — Admin
        </p>

        {/* Campo PIN */}
        <div className="relative mb-4">
          <input
            type={visivel ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && tentar()}
            placeholder="Digite o PIN"
            className={`input-dark w-full text-center text-lg tracking-[0.4em] pr-10
                        ${erro ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
          />
          <button
            type="button"
            onClick={() => setVisivel((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-muted hover:text-gold transition-colors"
          >
            {visivel ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {erro && (
          <p className="text-red-400 text-xs mb-4 animate-fade-in">PIN inválido. Tente novamente.</p>
        )}

        <button className="btn-gold w-full justify-center" onClick={tentar}>
          <ShieldCheck size={15} />
          Entrar
        </button>

        <p className="mt-5 text-xs text-gold-muted/40">
          Acesso exclusivo para Thieco Leandro
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
