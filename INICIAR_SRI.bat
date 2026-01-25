@echo off
TITLE SRI - Soluciones Rurales Integradas
echo 🚀 Iniciando Servidor SRI...
echo.

:: Abrir el navegador en el Dashboard después de 2 segundos
start "" "http://localhost:3000/auth/login.html"

:: Iniciar el backend
node backend/server.js

pause
