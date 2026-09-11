$ProjectRoot = Split-Path -Parent $PSScriptRoot
$IndexPath = Join-Path $ProjectRoot "index.html"

if (-not (Test-Path -LiteralPath $IndexPath)) {
  throw "PrepDash Admin index.html was not found at $IndexPath"
}

$ChromePaths = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)

$Chrome = $ChromePaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$FileUrl = (New-Object System.Uri($IndexPath)).AbsoluteUri

if ($Chrome) {
  Start-Process -FilePath $Chrome -ArgumentList $FileUrl
  Write-Host "Opened PrepDash in Chrome: $FileUrl"
} else {
  Start-Process $IndexPath
  Write-Host "Opened PrepDash in your default browser: $IndexPath"
}
