#!/bin/bash

# Script de instalação para o Dashboard de Monitoramento em Debian
# Este script instala o backend, frontend, PostgreSQL e RabbitMQ

# Verificar se está sendo executado como root
if [ "$(id -u)" -ne 0 ]; then
    echo "Este script deve ser executado como root"
    exit 1
fi

# Definir cores para saída
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Diretório base
BASE_DIR="/opt/monitoring-dashboard"
BACKEND_DIR="$BASE_DIR/backend"
FRONTEND_DIR="$BASE_DIR/frontend"
LOGS_DIR="$BASE_DIR/logs"

# Criar diretórios
echo -e "${YELLOW}Criando diretórios...${NC}"
mkdir -p $BACKEND_DIR
mkdir -p $FRONTEND_DIR
mkdir -p $LOGS_DIR

# Atualizar sistema
echo -e "${YELLOW}Atualizando sistema...${NC}"
apt update
apt upgrade -y

# Instalar dependências
echo -e "${YELLOW}Instalando dependências...${NC}"
apt install -y curl wget gnupg2 apt-transport-https ca-certificates lsb-release nginx postgresql postgresql-contrib rabbitmq-server

# Instalar Node.js
echo -e "${YELLOW}Instalando Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar instalações
echo -e "${YELLOW}Verificando instalações...${NC}"
node -v
npm -v
nginx -v
postgresql --version
rabbitmq-plugins enable rabbitmq_management

# Configurar PostgreSQL
echo -e "${YELLOW}Configurando PostgreSQL...${NC}"
# Criar usuário e banco de dados
su - postgres -c "psql -c \"CREATE USER monitoring WITH PASSWORD 'monitoring';\""
su - postgres -c "psql -c \"CREATE DATABASE monitoring_dashboard OWNER monitoring;\""
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE monitoring_dashboard TO monitoring;\""

# Configurar RabbitMQ
echo -e "${YELLOW}Configurando RabbitMQ...${NC}"
rabbitmqctl add_user admin a1b23fec99VMB
rabbitmqctl set_user_tags admin administrator
rabbitmqctl set_permissions -p / admin ".*" ".*" ".*"

# Copiar arquivos do backend
echo -e "${YELLOW}Copiando arquivos do backend...${NC}"
cp -r backend/* $BACKEND_DIR/

# Copiar arquivos do frontend
echo -e "${YELLOW}Copiando arquivos do frontend...${NC}"
cp -r frontend/* $FRONTEND_DIR/

# Instalar dependências do backend
echo -e "${YELLOW}Instalando dependências do backend...${NC}"
cd $BACKEND_DIR
npm install --production

# Configurar arquivo .env para o backend
echo -e "${YELLOW}Configurando variáveis de ambiente do backend...${NC}"
cat > $BACKEND_DIR/.env << EOF
# Configurações do servidor
PORT=3000
NODE_ENV=production

# Configurações do RabbitMQ
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=a1b23fec99VMB
RABBITMQ_VHOST=/
RABBITMQ_QUEUE_DATA=agent_data
RABBITMQ_QUEUE_COMMANDS=agent_commands

# Configurações do PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=monitoring
POSTGRES_PASSWORD=monitoring
POSTGRES_DB=monitoring_dashboard
EOF

# Configurar Nginx
echo -e "${YELLOW}Configurando Nginx...${NC}"
cat > /etc/nginx/sites-available/monitoring-dashboard << EOF
server {
    listen 80;
    server_name _;
    root $FRONTEND_DIR;
    index index.html;

    # Configuração para servir arquivos estáticos
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Proxy para o backend
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Configuração para o health check
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Configuração de erro
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF

# Ativar site no Nginx
ln -sf /etc/nginx/sites-available/monitoring-dashboard /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Criar serviço systemd para o backend
echo -e "${YELLOW}Criando serviço systemd para o backend...${NC}"
cat > /etc/systemd/system/monitoring-backend.service << EOF
[Unit]
Description=Monitoring Dashboard Backend
After=network.target postgresql.service rabbitmq-server.service

[Service]
Type=simple
User=root
WorkingDirectory=$BACKEND_DIR
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
StandardOutput=append:$LOGS_DIR/backend.log
StandardError=append:$LOGS_DIR/backend-error.log
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Recarregar systemd e iniciar serviço
systemctl daemon-reload
systemctl enable monitoring-backend
systemctl start monitoring-backend

# Inicializar banco de dados
echo -e "${YELLOW}Inicializando banco de dados...${NC}"
psql -U monitoring -d monitoring_dashboard -h localhost -f $BACKEND_DIR/schema.sql

# Verificar status dos serviços
echo -e "${YELLOW}Verificando status dos serviços...${NC}"
systemctl status postgresql
systemctl status rabbitmq-server
systemctl status nginx
systemctl status monitoring-backend

# Obter IP do servidor
SERVER_IP=$(hostname -I | awk '{print $1}')
echo -e "${GREEN}Instalação concluída!${NC}"
echo -e "${GREEN}Dashboard disponível em: http://$SERVER_IP${NC}"
echo -e "${GREEN}Interface do RabbitMQ disponível em: http://$SERVER_IP:15672${NC}"
echo -e "${GREEN}Usuário RabbitMQ: admin / Senha: a1b23fec99VMB${NC}"
echo -e "${YELLOW}Lembre-se de configurar o arquivo config.yaml do agente Windows com o IP: $SERVER_IP${NC}"
echo -e "${YELLOW}Execute o script install.bat no Windows para instalar o agente${NC}"
