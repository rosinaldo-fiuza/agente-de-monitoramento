@echo off
echo Iniciando Agente de Monitoramento...
call venv\Scripts\activate.bat
start pythonw agent_windows.py
echo Agente iniciado em segundo plano.
echo O ícone aparecerá na área de notificação.
timeout /t 5
