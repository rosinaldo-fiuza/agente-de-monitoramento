FROM python:3.10-slim

WORKDIR /app

# Instalar dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o código do agente
COPY agent.py .

# Criar diretório para logs
RUN mkdir -p logs

# Comando para iniciar o agente
CMD ["python", "agent.py"]
