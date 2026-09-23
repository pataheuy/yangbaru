@echo off
:: Memastikan dijalankan sebagai Administrator
NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Harap jalankan skrip ini sebagai Administrator!
    echo Klik kanan file ini lalu pilih 'Run as administrator'.
    pause
    exit /b
)

:: =========================================================
:: ID EKSTENSI ANDA
set "ID_EKSTENSI=dpkdbdahjlidkkbjielnjeobknoobkol"
:: =========================================================

echo Membersihkan registry lama...
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallAllowlist" /v "1" /f >nul 2>&1

echo Mendaftarkan ekstensi ke Edge Policy...
:: 1. Mengizinkan ID Ekstensi Anda
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallAllowlist" /v "1" /t REG_SZ /d "%ID_EKSTENSI%" /f

:: 2. Mengizinkan Developer Mode secara global via Policy agar tidak muncul popup peringatan
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge" /v "ExtensionDeveloperModeSettings" /t REG_DWORD /d 1 /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUKSES] Kebijakan berhasil diterapkan!
    echo Silakan buka Microsoft Edge, lalu buka alamat: edge://policy
    echo Klik tombol 'Reload Policies' untuk menerapkan perubahan.
) else (
    echo [GAGAL] Terjadi kesalahan saat menulis ke Registry.
)

pause
