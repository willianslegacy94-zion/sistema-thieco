# ─────────────────────────────────────────────────────────
#  Sistema Thieco Leandro — Stop ambiente local (dev)
#  Uso: .\dev-stop.ps1
# ─────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  Encerrando processos nas portas 3001 e 5173..." -ForegroundColor Cyan

function Stop-Port {
    param([int]$Port)
    $lines = netstat -ano | Select-String ":$Port\s"
    foreach ($line in $lines) {
        if ($line -match '(\d+)$') {
            $pid = [int]$Matches[1]
            if ($pid -gt 0) {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "  Porta $Port (PID $pid) encerrada." -ForegroundColor Yellow
            }
        }
    }
}

Stop-Port 3001
Stop-Port 5173

Write-Host ""
Write-Host "  Portas liberadas." -ForegroundColor Green
Write-Host ""
