import { useState } from 'react';
import { Eye, EyeOff, LogIn, Loader2, Scissors } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export default function Login() {
  const { login } = useAuth();

  const [form,     setForm]     = useState({ username: '', senha: '' });
  const [visivel,  setVisivel]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [erro,     setErro]     = useState('');

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); setErro(''); }

  async function submit(e) {
    e.preventDefault();
    if (!form.username || !form.senha) { setErro('Preencha usuário e senha.'); return; }

    setLoading(true);
    setErro('');
    try {
      const { token } = await api.auth.login(form.username, form.senha);
      login(token);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-onix-gradient flex flex-col items-center justify-center px-4">

      {/* Topo ornamental */}
      <div className="mb-8 text-center animate-fade-in">
        {/* Ícone / tesoura */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold/10 border border-gold-dark/50 mb-5 animate-pulse-gold">
          <Scissors size={24} className="text-gold" strokeWidth={1.5} />
        </div>

        <div className="gold-divider w-48 mx-auto mb-1">
          <span className="text-xs font-serif tracking-[0.35em] text-gold-dark uppercase">
            Barbearia
          </span>
        </div>

        <h1 className="font-serif font-black text-4xl tracking-widest text-gold-shimmer leading-none">
          Thieco Leandro
        </h1>

        <p className="mt-2 text-gold-light/60 text-xs font-serif italic tracking-wide">
          Autoestima Muda Destinos.{' '}
          <span className="text-gold not-italic font-semibold">Confiança Muda Tudo.</span>
        </p>

        <span className="mt-3 inline-block text-[10px] uppercase tracking-[0.3em] text-gold-muted">
          Sistema de Caixa
        </span>
      </div>

      {/* Card de login */}
      <div className="card-premium border border-surface-border w-full max-w-sm p-8 animate-slide-up">

        <h2 className="font-serif font-bold text-lg text-gold text-center mb-1">
          Acesso ao Sistema
        </h2>
        <div className="h-px bg-gradient-to-r from-transparent via-gold-dark/40 to-transparent mb-6" />

        <form onSubmit={submit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">
              Usuário
            </label>
            <input
              type="text"
              autoComplete="username"
              autoFocus
              placeholder="Digite seu usuário"
              className="input-dark w-full"
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
            />
          </div>

          {/* Senha */}
          <div>
            <label className="block text-xs text-gold-muted uppercase tracking-wider mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                type={visivel ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="input-dark w-full pr-10"
                value={form.senha}
                onChange={(e) => set('senha', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setVisivel((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-muted hover:text-gold transition-colors"
              >
                {visivel ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <p className="text-red-400 text-xs text-center animate-fade-in py-2 px-3 rounded-lg bg-red-900/20 border border-red-800/30">
              {erro}
            </p>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full justify-center mt-2"
          >
            {loading
              ? <Loader2 size={15} className="animate-spin" />
              : <LogIn size={15} />
            }
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

      </div>

      {/* Rodapé */}
      <p className="mt-6 text-xs text-gold-muted/30 text-center">
        Sistema exclusivo — Barbearia Thieco Leandro © 2025
      </p>
    </div>
  );
}
