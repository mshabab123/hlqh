$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendPath = Join-Path $root "backend"
$frontendPath = Join-Path $root "frontend"

Write-Host "Starting backend and frontend..."
Write-Host "Backend:  npm run dev"
Write-Host "Frontend: npm run dev"
Write-Host "Press Ctrl+C to stop both."

$backend = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory $backendPath -NoNewWindow -PassThru
$frontend = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory $frontendPath -NoNewWindow -PassThru

try {
  Wait-Process -Id @($backend.Id, $frontend.Id)
} finally {
  foreach ($process in @($backend, $frontend)) {
    if ($process -and -not $process.HasExited) {
      Stop-Process -Id $process.Id -Force
    }
  }
}
