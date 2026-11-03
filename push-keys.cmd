@echo off
rem Agent Smith - new keys from web\.env.local into the vault, then everything to server-2.
rem Double-click. Asks your KeePassXC master password once; each new key is checked with its
rem provider before it is stored; the vault (with your forge tokens) is then pushed.
cd /d "%~dp0"
chcp 65001 >nul
set PYTHONUNBUFFERED=1
python -m tools.keeper renew --from-env --no-browser --push-anyway
echo.
pause
