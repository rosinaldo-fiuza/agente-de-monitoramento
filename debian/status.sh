#!/bin/bash

# Script para verificar o status dos serviços do Dashboard de Monitoramento

# Verificar status do PostgreSQL
echo "Status do PostgreSQL:"
systemctl status postgresql --no-pager

# Verificar status do RabbitMQ
echo "Status do RabbitMQ:"
systemctl status rabbitmq-server --no-pager

# Verificar status do Nginx
echo "Status do Nginx:"
systemctl status nginx --no-pager

# Verificar status do Backend
echo "Status do Backend:"
systemctl status monitoring-backend --no-pager

# Verificar portas em uso
echo "Portas em uso:"
netstat -tulpn | grep -E '(5432|5672|15672|80|3000)'

# Obter IP do servidor
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "Dashboard disponível em: http://$SERVER_IP"
echo "Interface do RabbitMQ disponível em: http://$SERVER_IP:15672"
