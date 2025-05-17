@echo off
echo Instalando Agente de Monitoramento para Windows...

:: Verificar se Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python não encontrado. Por favor, instale o Python 3.8 ou superior.
    echo Você pode baixá-lo em https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Criar ambiente virtual
echo Criando ambiente virtual...
python -m venv venv
call venv\Scripts\activate.bat

:: Instalar dependências
echo Instalando dependências...
pip install -r requirements.txt

:: Criar atalho na pasta de inicialização
echo Criando atalho na pasta de inicialização...
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SCRIPT_PATH=%~dp0agent_windows.py
set VENV_PYTHON=%~dp0venv\Scripts\pythonw.exe

echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%STARTUP_FOLDER%\MonitoringAgent.lnk" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%VENV_PYTHON%" >> CreateShortcut.vbs
echo oLink.Arguments = "%SCRIPT_PATH%" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%~dp0" >> CreateShortcut.vbs
echo oLink.Description = "Agente de Monitoramento" >> CreateShortcut.vbs
echo oLink.IconLocation = "%VENV_PYTHON%, 0" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs
cscript //nologo CreateShortcut.vbs
del CreateShortcut.vbs

echo.
echo Instalação concluída!
echo O agente será iniciado automaticamente na próxima inicialização do Windows.
echo Para iniciar o agente agora, execute run.bat
echo.
pause
