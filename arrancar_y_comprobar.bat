@echo off
setlocal
cd /d C:\Users\Jordi\Desktop\InvertCursor

echo Iniciando servidor...
start "Servidor InvertCursor" cmd /k "cd /d C:\Users\Jordi\Desktop\InvertCursor && python server.py"

echo Esperando 2 segundos...
timeout /t 2 /nobreak >nul

echo Abriendo navegador...
start "" http://127.0.0.1:8000/index.html

echo.
echo Ejecutando diagnostico...
python diagnostico_carga.py

echo.
echo Si la tabla no se ve completa, haz una captura o describe si falta ancho o alto.
pause
