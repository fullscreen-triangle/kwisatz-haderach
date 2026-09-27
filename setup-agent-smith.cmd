@echo off
rem Agent Smith - one-time setup. Double-click this file and answer the prompts.
rem Passwords are typed at hidden prompts and go only into your KeePassXC vault.
cd /d "%~dp0"
chcp 65001 >nul
python -m pip install --quiet --disable-pip-version-check -r tools\keeper\requirements.txt
python -m tools.keeper setup
echo.
pause
