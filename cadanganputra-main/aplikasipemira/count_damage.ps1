$path = 'c:\Users\ASSYIFA\Documents\yangbaru\cadanganputra-main\aplikasipemira\admin\app.js'
$c = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$replacement = [char]0xFFFD  # Unicode replacement character
$count = ($c.ToCharArray() | Where-Object { $_ -eq $replacement }).Count
Write-Host "Unicode replacement chars (damaged): $count"
Write-Host "Total length: $($c.Length)"

# Show a few damaged areas
$matches = [regex]::Matches($c, '.{0,20}' + [char]0xFFFD + '.{0,20}')
Write-Host "`nFirst 5 damaged areas:"
$matches | Select-Object -First 5 | ForEach-Object { Write-Host "  [$($_.Value)]" }
