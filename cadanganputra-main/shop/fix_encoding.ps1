$files = @(
    "c:\Users\ASSYIFA\OneDrive\Documents\GitHub\yangbaru\cadanganputra-main\shop\index.html",
    "c:\Users\ASSYIFA\OneDrive\Documents\GitHub\yangbaru\cadanganputra-main\shop\admin.html"
)

foreach ($file in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($file)
    # File tersimpan sebagai UTF-8 tapi karakter non-ASCII di-encode ulang rusak
    # Baca ulang dengan encoding yang benar
    $content = [System.Text.Encoding]::UTF8.GetString($bytes)
    
    # Ganti semua pola rusak
    $content = $content -replace [regex]::Escape("â€¢"), "•"
    $content = $content -replace [regex]::Escape("â€""), "–"
    $content = $content -replace [regex]::Escape("â€""), "—"
    $content = $content -replace [regex]::Escape("â†'"), "→"
    $content = $content -replace [regex]::Escape("â†""), "↓"
    $content = $content -replace [regex]::Escape("â†'"), "←"
    $content = $content -replace [regex]::Escape("Ã—"), "×"
    $content = $content -replace [regex]::Escape("â•â•â•"), "═══"
    $content = $content -replace [regex]::Escape("â"€"), "─"
    $content = $content -replace [regex]::Escape("â"‚"), "│"
    $content = $content -replace [regex]::Escape("ðŸ"¥"), "🔥"
    $content = $content -replace [regex]::Escape("â€""), "–"
    
    [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Fixed: $file"
}
