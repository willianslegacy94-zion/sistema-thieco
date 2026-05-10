# ─────────────────────────────────────────────────────────
#  Backend — Node.js + Express
#  Build em dois estágios para imagem final enxuta
# ─────────────────────────────────────────────────────────

# ── Estágio 1: instalar dependências de produção ──────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

# Instala somente deps de produção (exclui nodemon, etc.)
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# ── Estágio 2: imagem final ───────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Usuário não-root para segurança
RUN addgroup -S appgroup && \
    adduser  -S appuser  -G appgroup

# Copia deps do estágio anterior
COPY --from=deps /app/node_modules ./node_modules

# Copia código-fonte (respeitando .dockerignore)
COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 3001

# Healthcheck usa o endpoint /health que já existe
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "server.js"]
