@echo off
rem Agent Smith - copy the desk website login (made on the server) into your KeePassXC vault.
rem The password is never shown here; afterwards find it in KeePassXC under Websites.
cd /d "%~dp0"
chcp 65001 >nul
python -m pip install --quiet --disable-pip-version-check -r tools\keeper\requirements.txt
python -m tools.keeper save-console-login
echo.
pause
