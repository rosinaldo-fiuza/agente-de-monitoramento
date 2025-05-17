#!/bin/bash

# Script para parar os serviços do Dashboard de Monitoramento

# Verificar se está sendo executado como root
if [ "$(id -u)" -ne 0 ]; then
    echo "Este script deve ser executado como root"
    exit 1
fi

# Parar Backend
echo "Parando Backend..."
systemctl stop monitoring-backend
systemctl status monitoring-backend --no-pager

# Parar Nginx
echo "Parando Nginx..."
systemctl stop nginx
systemctl status nginx --no-pager

# Parar RabbitMQ
echo "Parando RabbitMQ..."
systemctl stop rabbitmq-server
systemctl status rabbitmq-server --no-pager

# Parar PostgreSQL
echo "Parando PostgreSQL..."
systemctl stop postgresql
systemctl status postgresql --no-pager

echo "Todos os serviços foram parados"
