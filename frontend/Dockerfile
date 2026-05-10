# ─────────────────────────────────────────────────────────
#  Frontend — React + Vite → Nginx
#  Estágio 1: build do Vite
#  Estágio 2: serve com Nginx (imagem final ~25 MB)
# ─────────────────────────────────────────────────────────

# ── Estágio 1: build ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instala deps primeiro (cache de layer)
COPY package*.json ./
RUN npm ci --ignore-scripts && \
    npm cache clean --force

# Copia código e gera build de produção
COPY . .
RUN npm run build

# ── Estágio 2: Nginx ──────────────────────────────────────
FROM nginx:1.27-alpine

# Remove config padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia build do React
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configuração customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
