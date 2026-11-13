param([Parameter(Mandatory=$true)][string]$Apk)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$destination = Join-Path $PSScriptRoot '..\.local\dex'
New-Item -ItemType Directory -Force $destination | Out-Null
$archive = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Apk))
try {
  $expectedNames = @($archive.Entries | Where-Object { $_.FullName -match '^classes(?:[0-9]+)?\.dex$' } | ForEach-Object { $_.FullName })
  $stale = @(Get-ChildItem -LiteralPath $destination -Filter '*.dex' | Where-Object { $_.Name -notin $expectedNames })
  if ($stale.Count -gt 0) { throw 'Existing DEX directory contains files from another APK; use a fresh .local/dex directory.' }
  foreach ($entry in $archive.Entries) {
    if ($entry.FullName -match '^classes(?:[0-9]+)?\.dex$') {
      [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $destination $entry.FullName), $true)
    }
  }
} finally { $archive.Dispose() }
node (Join-Path $PSScriptRoot 'discover-endpoints.mjs') $Apk $destination (Join-Path $PSScriptRoot '..\evidence\endpoint-candidates.json')
if ($LASTEXITCODE -ne 0) { throw 'DEX discovery failed' }
