@echo off
setlocal
echo ==========================================
echo Starting SmartCourt Django Backend...
echo API Base URL: http://127.0.0.1:8000/api/
echo Admin URL:    http://127.0.0.1:8000/admin/
echo ==========================================
cd /d "%~dp0backend"

set "PYTHON=python"
if exist "venv\Scripts\python.exe" set "PYTHON=venv\Scripts\python.exe"
if exist ".venv\Scripts\python.exe" set "PYTHON=.venv\Scripts\python.exe"

%PYTHON% manage.py migrate
if errorlevel 1 (
	echo Database migration failed. Check that Django is installed in the selected Python environment.
	pause
	exit /b 1
)

%PYTHON% manage.py runserver 0.0.0.0:8000
pause
