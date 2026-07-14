@echo off
setlocal

REM Inicia o Safe NFe em ambiente local.
REM Este script deve ser executado a partir da pasta raiz do projeto.

cd /d "%~dp0"

echo.
echo ========================================
echo   Safe NFe - Inicializador local
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado.
  echo Instale o Node.js antes de iniciar o sistema.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm nao encontrado.
  echo Reinstale o Node.js incluindo o npm.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] Dependencias nao encontradas. Instalando...
  npm install
  if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

if not exist "backend\storage" (
  mkdir "backend\storage"
)

echo [INFO] Iniciando backend e frontend...
echo.
echo Frontend: http://127.0.0.1:5173
echo Backend:  http://localhost:4000
echo.
echo Login inicial:
echo   E-mail: admin@safe-nfe.local
echo   Senha:  123456
echo.
echo Para encerrar, feche esta janela ou pressione Ctrl+C.
echo.

npm run dev

pause
