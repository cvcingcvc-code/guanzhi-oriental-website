$ErrorActionPreference = 'Stop'

$sourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outputRoot = Join-Path $sourceRoot 'output'
$packageRoot = Join-Path $outputRoot 'handoff-package'
$zipPath = Join-Path $outputRoot 'guanzhi-oriental-source-handoff-2026-08-12.zip'

New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
$resolvedOutput = (Resolve-Path -LiteralPath $outputRoot).Path

function Assert-InOutput([string]$Path) {
  $parent = Split-Path -Parent $Path
  $resolvedParent = if (Test-Path -LiteralPath $parent) { (Resolve-Path -LiteralPath $parent).Path } else { $parent }
  if (-not $resolvedParent.StartsWith($resolvedOutput, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify a path outside output: $Path"
  }
}

Assert-InOutput $packageRoot
Assert-InOutput $zipPath

if (Test-Path -LiteralPath $packageRoot) {
  Remove-Item -LiteralPath $packageRoot -Recurse -Force
}
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $packageRoot | Out-Null

$excludedTop = @(
  '.git',
  '.env',
  '.codex-tmp',
  'node_modules',
  'dist',
  'output',
  'tmp',
  '合同-观止东方品牌官网-已补全版.md'
)

Get-ChildItem -LiteralPath $sourceRoot -Force |
  Where-Object { $excludedTop -notcontains $_.Name } |
  ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $packageRoot -Recurse -Force }

$backendPackage = Join-Path $packageRoot 'backend'
foreach ($name in @('.env', 'node_modules', 'dist', 'data')) {
  $target = Join-Path $backendPackage $name
  if (Test-Path -LiteralPath $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
  }
}

Get-ChildItem -LiteralPath $packageRoot -Recurse -Force -File |
  Where-Object { $_.Name -match '^\.env($|\.)' -and $_.Name -notlike '*.example' } |
  Remove-Item -Force

Compress-Archive -Path (Join-Path $packageRoot '*') -DestinationPath $zipPath -CompressionLevel Optimal

$zip = Get-Item -LiteralPath $zipPath
[pscustomobject]@{
  path = $zip.FullName
  sizeBytes = $zip.Length
  sizeMB = [Math]::Round($zip.Length / 1MB, 2)
  files = (Get-ChildItem -LiteralPath $packageRoot -Recurse -File).Count
} | ConvertTo-Json -Compress
