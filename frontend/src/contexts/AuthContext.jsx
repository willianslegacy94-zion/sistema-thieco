import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'thieco_auth_token';

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    // Padding base64url → base64
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(
      payload.length + (4 - (payload.length % 4)) % 4, '='
    );
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isTokenExpired(decoded) {
  if (!decoded?.exp) return true;
  return Date.now() / 1000 >= decoded.exp;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return null;
    const decoded = decodeJWT(stored);
    if (!decoded || isTokenExpired(decoded)) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return stored;
  });

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return null;
    const decoded = decodeJWT(stored);
    return decoded && !isTokenExpired(decoded) ? decoded : null;
  });

  const login = useCallback((newToken) => {
    const decoded = decodeJWT(newToken);
    if (!decoded || isTokenExpired(decoded)) return;
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(decoded);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Verificação periódica de expiração (a cada minuto)
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && isTokenExpired(user)) logout();
    }, 60_000);
    return () => clearInterval(interval);
  }, [user, logout]);

  const value = {
    token,
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin:    user?.role === 'admin',
    isBarbeiro: user?.role === 'barbeiro',
    isOperador: user?.role === 'operador',
    profissionalId: user?.profissional_id ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
