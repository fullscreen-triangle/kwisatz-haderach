@echo off
rem Agent Smith - Gmail shows REJECTED / dead credentials. Double-click this file:
rem sign in at Google in the browser tab it opens; the new token goes into your
rem KeePassXC vault and to the server. Nothing is shown on screen.
cd /d "%~dp0"
chcp 65001 >nul
python -m pip install --quiet --disable-pip-version-check -r tools\keeper\requirements.txt
python -m tools.keeper reconnect-gmail
echo.
pause
