# Sistema Thieco — Ambiente Local (Dev)

Stack: React + Vite (frontend) · Node/Express (backend) · PostgreSQL

---

## Inicio rapido

```powershell
# Na raiz do projeto:
.\dev-start.ps1
```

Abre dois terminais: um para o backend (porta 3001) e outro para o frontend (porta 5173).  
Acesse: **http://localhost:5173**

---

## Encerrar

```powershell
.\dev-stop.ps1
```

---

## Portas

| Servico  | Porta | URL                    |
|----------|-------|------------------------|
| Frontend | 5173  | http://localhost:5173  |
| Backend  | 3001  | http://localhost:3001  |
| Postgres | 5432  | localhost:5432         |

---

## Pre-requisitos

- Node.js instalado (`node -v`)
- PostgreSQL rodando como servico do Windows (porta 5432)
- Arquivo `backend\.env` configurado com:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sistema_thieco
DB_USER=postgres
DB_PASSWORD=sua_senha
JWT_SECRET=chave_secreta
JWT_EXPIRES_IN=8h
PORT=3001
```

---

## Primeira vez (instalacao de dependencias)

```powershell
# Backend
cd backend
npm install

# Frontend
cd ..\frontend
npm install
```

---

## Docker (ambiente completo / producao)

```powershell
# Subir tudo
docker compose up -d

# Ver logs
docker compose logs -f

# Parar
docker compose down
```

Acesso via Docker: **http://localhost** (porta 80)

---

## Comandos uteis (Makefile)

```powershell
make up        # sobe via Docker
make down      # para Docker
make logs      # logs em tempo real
make ps        # status dos containers
make shell-db  # abre psql no banco
make build     # rebuild completo
```
