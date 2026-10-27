<#
restore-media.ps1 — upload ulang file media spotipai ke Supabase Storage.

Latar belakang:
  Bucket `media` di Supabase Storage sudah tidak ada (NoSuchBucket), sehingga semua
  audio_url/cover_url di tabel `songs` mengarah ke file yang hilang. Metadata lagunya
  sendiri masih lengkap (80 baris), jadi cukup upload ulang file ke path yang SAMA
  supaya kolom audio_url/cover_url di database tidak perlu diubah.

Yang dilakukan script ini:
  1. Membaca daftar path yang dibutuhkan dari tabel `songs` (audio_url + cover_url).
  2. Mencari file lokalnya di -SourceDir secara rekursif (dicocokkan per nama file).
  3. Membuat bucket `media` (public) kalau belum ada.
  4. Upload ke /storage/v1/object/media/<path> yang sama seperti URL lama.

Pemakaian:
  # pratinjau dulu (tidak upload apa pun)
  .\restore-media.ps1 -ServiceKey "SERVICE_ROLE_KEY" -SourceDir "C:\folder\lagu" -DryRun

  # upload sungguhan
  .\restore-media.ps1 -ServiceKey "SERVICE_ROLE_KEY" -SourceDir "C:\folder\lagu"

  # service key juga bisa lewat environment variable
  $env:SUPABASE_SERVICE_KEY = "..."
  .\restore-media.ps1 -SourceDir "C:\folder\lagu"

PENTING:
  - Pakai service_role key (bukan anon key): Supabase Dashboard -> Project Settings -> API.
  - Jangan commit key ini ke git.
  - Nama file lokal harus SAMA PERSIS dengan nama di media-manifest.csv,
    karena pencocokan dilakukan per nama file. Kalau nama filenya beda,
    rename dulu atau upload manual sesuai daftar di media-manifest.csv.
#>

param(
    [string]$SupabaseUrl = "https://puywjdopumlzvmzbcudr.supabase.co",
    [string]$ServiceKey  = $env:SUPABASE_SERVICE_KEY,
    [string]$Bucket      = "media",
    [string]$SourceDir   = ".",
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

if (-not $ServiceKey) {
    throw "Service key belum diisi. Pakai -ServiceKey atau set environment variable SUPABASE_SERVICE_KEY."
}
if (-not (Test-Path -LiteralPath $SourceDir)) {
    throw "Folder sumber tidak ditemukan: $SourceDir"
}

$base = $SupabaseUrl.TrimEnd('/')
$headers = @{
    apikey        = $ServiceKey
    Authorization = "Bearer $ServiceKey"
}

function Get-ContentType($fileName) {
    switch ([System.IO.Path]::GetExtension($fileName).ToLower()) {
        '.mp3'  { 'audio/mpeg' }
        '.m4a'  { 'audio/mp4' }
        '.wav'  { 'audio/wav' }
        '.ogg'  { 'audio/ogg' }
        '.jpeg' { 'image/jpeg' }
        '.jpg'  { 'image/jpeg' }
        '.png'  { 'image/png' }
        '.webp' { 'image/webp' }
        default { 'application/octet-stream' }
    }
}

# ---------- 1. Daftar path yang dibutuhkan, diambil dari database ----------
Write-Host "Membaca daftar lagu dari tabel songs..." -ForegroundColor Cyan
$songs = Invoke-RestMethod -Uri "$base/rest/v1/songs?select=title,audio_url,cover_url" -Headers $headers -TimeoutSec 60

$prefix = "$base/storage/v1/object/public/$Bucket/"
$needed = New-Object System.Collections.Generic.List[object]
foreach ($s in $songs) {
    foreach ($u in @($s.audio_url, $s.cover_url)) {
        if ($u -and $u.StartsWith($prefix)) {
            $needed.Add([pscustomobject]@{
                Path  = $u.Substring($prefix.Length)
                Title = $s.title
            })
        }
    }
}
Write-Host ("Butuh {0} file ({1} audio + {2} cover)." -f $needed.Count, ($needed | Where-Object { $_.Path -like 'audio/*' }).Count, ($needed | Where-Object { $_.Path -like 'covers/*' }).Count) -ForegroundColor Cyan

# ---------- 2. Index file lokal berdasarkan nama file ----------
Write-Host "Memindai file lokal di: $SourceDir" -ForegroundColor Cyan
$localFiles = @{}
foreach ($f in Get-ChildItem -LiteralPath $SourceDir -Recurse -File) {
    if (-not $localFiles.ContainsKey($f.Name)) { $localFiles[$f.Name] = $f.FullName }
}
Write-Host ("Ditemukan {0} file lokal." -f $localFiles.Count) -ForegroundColor Cyan

# ---------- 3. Pastikan bucket ada ----------
if (-not $DryRun) {
    $bucketOk = $false
    try {
        Invoke-RestMethod -Uri "$base/storage/v1/bucket/$Bucket" -Headers $headers -TimeoutSec 30 | Out-Null
        $bucketOk = $true
    } catch { }

    if (-not $bucketOk) {
        Write-Host "Bucket '$Bucket' belum ada, membuat bucket public..." -ForegroundColor Yellow
        $body = @{ id = $Bucket; name = $Bucket; public = $true } | ConvertTo-Json
        Invoke-RestMethod -Uri "$base/storage/v1/bucket" -Method Post -Headers $headers -ContentType 'application/json' -Body $body -TimeoutSec 30 | Out-Null
    }
}

# ---------- 4. Upload ----------
$uploaded = 0
$failed   = New-Object System.Collections.Generic.List[string]
$missing  = New-Object System.Collections.Generic.List[string]

foreach ($item in $needed) {
    $fileName = ($item.Path -split '/')[-1]
    if (-not $localFiles.ContainsKey($fileName)) {
        $missing.Add("$($item.Path)   <- '$fileName' tidak ada di $SourceDir")
        continue
    }
    $file = $localFiles[$fileName]

    if ($DryRun) {
        Write-Host "[DRY-RUN] siap upload: $fileName -> $($item.Path)" -ForegroundColor DarkGray
        continue
    }

    $encodedPath = (($item.Path -split '/') | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
    $uri = "$base/storage/v1/object/$Bucket/$encodedPath"
    $h = @{
        apikey        = $ServiceKey
        Authorization = "Bearer $ServiceKey"
        'x-upsert'    = 'true'
    }
    try {
        Invoke-WebRequest -Uri $uri -Method Post -Headers $h -InFile $file -ContentType (Get-ContentType $fileName) -TimeoutSec 300 | Out-Null
        $uploaded++
        Write-Host "[OK] $($item.Path)" -ForegroundColor Green
    } catch {
        $failed.Add("$($item.Path)   <- $($_.Exception.Message)")
        Write-Host "[GAGAL] $($item.Path)" -ForegroundColor Red
    }
}

# ---------- Ringkasan ----------
Write-Host ""
Write-Host "================ RINGKASAN ================" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "Mode DRY-RUN: tidak ada file yang diupload." -ForegroundColor Yellow
} else {
    Write-Host "Berhasil upload : $uploaded"
}
Write-Host "Belum ada file  : $($missing.Count)"
Write-Host "Gagal upload    : $($failed.Count)"

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "-- File yang belum ada di $SourceDir --" -ForegroundColor Yellow
    $missing | ForEach-Object { Write-Host "  $_" }
}
if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "-- File yang gagal diupload --" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  $_" }
}
Write-Host ""
Write-Host "Daftar lengkap path yang dibutuhkan ada di spotipai\media-manifest.csv" -ForegroundColor Cyan
