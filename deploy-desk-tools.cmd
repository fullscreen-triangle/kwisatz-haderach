@echo off
rem Agent Smith - put the desk's tools and keys on server-2. Double-click this file.
rem It runs deploy\desk-tools.sh in Git Bash (not WSL): copies the code, rebuilds the
rem services, then asks for your KeePassXC master password to move new keys from
rem web\.env.local into the vault and push it.
cd /d "%~dp0"
chcp 65001 >nul
set "GITBASH=%ProgramFiles%\Git\bin\bash.exe"
if not exist "%GITBASH%" (
  echo Git Bash was not found at "%GITBASH%".
  pause
  exit /b 1
)
set PYTHONUNBUFFERED=1
"%GITBASH%" -c "bash deploy/desk-tools.sh 2>&1 | tee \"$TEMP/deploy-desk-tools.log\""
echo.
echo A copy of everything above is in %TEMP%\deploy-desk-tools.log (no secrets are printed).
pause
