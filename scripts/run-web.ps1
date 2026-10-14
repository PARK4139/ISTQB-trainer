$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$port = 8000
$url = "http://localhost:$port/istqb_ctfl_7day_learning.html"

$python = Get-Command py -ErrorAction SilentlyContinue
$node = Get-Command node -ErrorAction SilentlyContinue
$pythonExe = Get-Command python -ErrorAction SilentlyContinue
if ($pythonExe -and $pythonExe.Source -notlike '*\Microsoft\WindowsApps\*') {
  $python = $pythonExe
}
if (-not $python -and -not $node) {
  throw 'Python 3 또는 Node.js를 찾을 수 없습니다. 둘 중 하나를 설치하고 PATH에 추가하세요.'
}

Write-Host "학습 웹페이지: $url"
Write-Host '서버를 종료하려면 Ctrl+C를 누르세요.'
Start-Process $url

if ($python) {
  if ($python.Name -eq 'py') {
    & $python.Source -3 -m http.server $port --directory $repoRoot
  } else {
    & $python.Source -m http.server $port --directory $repoRoot
  }
} else {
  & $node.Source (Join-Path $PSScriptRoot 'static-server.mjs') $repoRoot $port
}
