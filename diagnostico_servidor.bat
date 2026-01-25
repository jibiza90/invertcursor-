@echo off
setlocal
cd /d C:\Users\Jordi\Desktop\InvertCursor

echo Iniciando servidor en otra ventana...
start "Servidor InvertCursor" cmd /k "cd /d C:\Users\Jordi\Desktop\InvertCursor && python server.py"
echo Esperando 2 segundos...
timeout /t 2 /nobreak >nul
echo.
echo Probando servidor...
powershell -Command "try { $resp = Invoke-WebRequest -Uri http://127.0.0.1:8000/index.html -UseBasicParsing -TimeoutSec 5; Write-Host 'index.html:' $resp.StatusCode } catch { Write-Host 'index.html: ERROR' $_.Exception.Message }"
powershell -Command "try { $resp = Invoke-WebRequest -Uri http://127.0.0.1:8000/app.js -UseBasicParsing -TimeoutSec 5; Write-Host 'app.js:' $resp.StatusCode } catch { Write-Host 'app.js: ERROR' $_.Exception.Message }"
powershell -Command "try { $resp = Invoke-WebRequest -Uri http://127.0.0.1:8000/api/meses -UseBasicParsing -TimeoutSec 5; Write-Host '/api/meses:' $resp.StatusCode; Write-Host $resp.Content } catch { Write-Host '/api/meses: ERROR' $_.Exception.Message }"

echo.
echo Si ves errores, copia este resultado y enviamelo.
pause
