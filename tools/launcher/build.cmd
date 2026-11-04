@echo off
rem Builds AgentSmith.exe outside this project and puts it on the Desktop and in the Start menu.
rem The program needs nothing from the project once built; re-run only after changing AgentSmith.cs.
setlocal
set "HERE=%~dp0"
set "OUT=%LOCALAPPDATA%\Programs\AgentSmith"
set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%OUT%" mkdir "%OUT%"

python "%HERE%make_icon.py" "%OUT%\agent-smith.ico" || goto :fail
"%CSC%" /nologo /target:winexe /optimize+ /out:"%OUT%\AgentSmith.exe" /win32icon:"%OUT%\agent-smith.ico" ^
  /reference:System.Windows.Forms.dll "%HERE%AgentSmith.cs" || goto :fail

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = New-Object -ComObject WScript.Shell; foreach ($d in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) { $l = $s.CreateShortcut((Join-Path $d 'Agent Smith.lnk')); $l.TargetPath = '%OUT%\AgentSmith.exe'; $l.WorkingDirectory = '%OUT%'; $l.IconLocation = '%OUT%\agent-smith.ico'; $l.Description = 'The desk on server-2'; $l.Save() }" || goto :fail

echo Built %OUT%\AgentSmith.exe - "Agent Smith" is on the Desktop and in the Start menu.
exit /b 0
:fail
echo Build failed.
exit /b 1
