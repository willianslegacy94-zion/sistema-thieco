const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET  ?? 'thieco-secret-mude-em-producao';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN ?? '8h';

// ─── Geração de token ─────────────────────────────────────────────────────────

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// ─── Validação de token (aplica em todas as rotas protegidas) ─────────────────

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de acesso não fornecido.' });
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Sessão expirada. Faça login novamente.'
      : 'Token inválido.';
    return res.status(401).json({ erro: msg });
  }
}

// ─── Guarda de papel ──────────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      erro: 'Acesso restrito a administradores.',
      role_atual: req.user?.role,
    });
  }
  next();
}

// ─── Helper: verificar se o usuário pode acessar dados de outro profissional ──

function podeVerProfissional(req, profissionalId) {
  return req.user.role === 'admin' ||
         req.user.profissional_id === parseInt(profissionalId);
}

module.exports = { signToken, authenticate, requireAdmin, podeVerProfissional };
