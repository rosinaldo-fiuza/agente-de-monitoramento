#!/bin/bash

# Script para iniciar os serviços do Dashboard de Monitoramento

# Verificar se está sendo executado como root
if [ "$(id -u)" -ne 0 ]; then
    echo "Este script deve ser executado como root"
    exit 1
fi

# Iniciar PostgreSQL
echo "Iniciando PostgreSQL..."
systemctl start postgresql
systemctl status postgresql --no-pager

# Iniciar RabbitMQ
echo "Iniciando RabbitMQ..."
systemctl start rabbitmq-server
systemctl status rabbitmq-server --no-pager

# Iniciar Nginx
echo "Iniciando Nginx..."
systemctl start nginx
systemctl status nginx --no-pager

# Iniciar Backend
echo "Iniciando Backend..."
systemctl start monitoring-backend
systemctl status monitoring-backend --no-pager

# Obter IP do servidor
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "Dashboard disponível em: http://$SERVER_IP"
echo "Interface do RabbitMQ disponível em: http://$SERVER_IP:15672"
