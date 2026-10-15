$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$webRoot = Join-Path $repoRoot 'web'
$port = 8000
$url = "http://localhost:$port/"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw 'Node.js를 찾을 수 없습니다. 학습 메모를 파일로 저장하려면 Node.js를 설치하고 PATH에 추가하세요.'
}

Write-Host "학습 웹페이지: $url"
Write-Host '서버를 종료하려면 Ctrl+C를 누르세요.'
Start-Process $url

& $node.Source (Join-Path $PSScriptRoot 'static-server.mjs') $webRoot $port
exit $LASTEXITCODE
