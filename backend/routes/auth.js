/**
 * POST /auth/login  → retorna JWT
 * GET  /auth/me     → retorna usuário logado (requer token)
 */

const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { signToken, authenticate } = require('../middleware/auth');

const router = Router();

// ─── Login ────────────────────────────────────────────────────────────────────

router.post('/login',
  body('username').trim().notEmpty().withMessage('username obrigatório'),
  body('senha').notEmpty().withMessage('senha obrigatória'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ erros: errors.array() });

    const { username, senha } = req.body;

    try {
      const { rows } = await query(
        `SELECT u.*, p.percentual_comissao, p.unidade AS prof_unidade
         FROM usuarios u
         LEFT JOIN profissionais p ON p.id = u.profissional_id
         WHERE LOWER(u.username) = LOWER($1) AND u.ativo = true
         LIMIT 1`,
        [username]
      );

      // Resposta genérica para não vazar se o usuário existe
      if (!rows.length) {
        await bcrypt.compare('dummy', '$2a$10$dummyhashtopreventtimingattacks00000000000000000000000');
        return res.status(401).json({ erro: 'Credenciais inválidas.' });
      }

      const usuario = rows[0];
      const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
      if (!senhaCorreta) return res.status(401).json({ erro: 'Credenciais inválidas.' });

      const payload = {
        id:              usuario.id,
        nome:            usuario.nome,
        username:        usuario.username,
        role:            usuario.role,
        profissional_id: usuario.profissional_id,
        unidade:         usuario.prof_unidade ?? usuario.unidade_acesso ?? null,
      };

      const token = signToken(payload);

      res.json({
        token,
        usuario: payload,
      });
    } catch (err) {
      console.error('Erro no login:', err);
      res.status(500).json({ erro: 'Erro interno.' });
    }
  }
);

// ─── Me ───────────────────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.nome, u.username, u.role, u.profissional_id, u.ativo,
              p.percentual_comissao, p.unidade AS prof_unidade
       FROM usuarios u
       LEFT JOIN profissionais p ON p.id = u.profissional_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
