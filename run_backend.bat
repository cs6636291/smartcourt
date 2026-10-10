@echo off
echo ==========================================
echo Starting SmartCourt Django Backend...
echo API Base URL: http://127.0.0.1:8000/api/
echo Admin URL:    http://127.0.0.1:8000/admin/
echo ==========================================
cd backend
venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
pause
