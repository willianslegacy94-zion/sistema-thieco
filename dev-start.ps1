# ─────────────────────────────────────────────────────────
#  Sistema Thieco Leandro — Start ambiente local (dev)
#  Uso: .\dev-start.ps1
#
#  O que faz:
#    1. Abre o Backend  (Node/Express) na porta 3001
#    2. Abre o Frontend (Vite/React)   na porta 5173
#
#  Pré-requisitos:
#    - Node.js instalado
#    - PostgreSQL rodando (porta 5432)
#    - Arquivo backend\.env configurado
# ─────────────────────────────────────────────────────────

$root    = $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

Write-Host ""
Write-Host "  Sistema Thieco — Iniciando ambiente de desenvolvimento..." -ForegroundColor Cyan
Write-Host ""

# ── Backend ─────────────────────────────────────────────
Write-Host "  [1/2] Backend  → http://localhost:3001" -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Set-Location '$backend'; Write-Host '[BACKEND]' -ForegroundColor Green; npm run dev"

Start-Sleep -Milliseconds 800

# ── Frontend ─────────────────────────────────────────────
Write-Host "  [2/2] Frontend → http://localhost:5173" -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Set-Location '$frontend'; Write-Host '[FRONTEND]' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "  Aguarde ~5s para os servidores inicializarem." -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Acesse: http://localhost:5173" -ForegroundColor Green
Write-Host ""
