@echo off
rem Agent Smith - make this laptop's files reachable from the phone (over Tailscale).
rem 1. installs the laptop node's packages in its own venv
rem 2. adds it to your Startup folder and starts it (no admin; no window; listens only on Tailscale)
rem 3. puts its address + token in your KeePassXC vault and pushes them to server-2
rem Re-running is safe. Remove with: python -m tools.laptop_node uninstall
cd /d "%~dp0"
chcp 65001 >nul
set "VENV=%LOCALAPPDATA%\agent-smith\laptop-venv"
if not exist "%VENV%\Scripts\python.exe" py -3 -m venv "%VENV%"
"%VENV%\Scripts\python.exe" -m pip install --quiet --disable-pip-version-check -r tools\laptop_node\requirements.txt
"%VENV%\Scripts\python.exe" -m tools.laptop_node install || goto :end
python -m pip install --quiet --disable-pip-version-check -r tools\keeper\requirements.txt
python -m tools.keeper add-laptop
echo.
"%VENV%\Scripts\python.exe" -m tools.laptop_node status
:end
echo.
pause
