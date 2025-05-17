#!/bin/bash

# Script para construir imagens Docker para o Dashboard de Monitoramento

# Definir variáveis
REGISTRY="your-registry.com"  # Substitua pelo seu registro de contêineres
VERSION="1.0.0"

# Construir imagem do backend
echo "Construindo imagem do backend..."
docker build -t $REGISTRY/monitoring-dashboard-backend:$VERSION -t $REGISTRY/monitoring-dashboard-backend:latest -f Dockerfile.backend .

# Construir imagem do frontend
echo "Construindo imagem do frontend..."
docker build -t $REGISTRY/monitoring-dashboard-frontend:$VERSION -t $REGISTRY/monitoring-dashboard-frontend:latest -f Dockerfile.frontend .

# Construir imagem do agente
echo "Construindo imagem do agente..."
docker build -t $REGISTRY/monitoring-dashboard-agent:$VERSION -t $REGISTRY/monitoring-dashboard-agent:latest -f agent/Dockerfile agent/

# Enviar imagens para o registro
echo "Enviando imagens para o registro..."
docker push $REGISTRY/monitoring-dashboard-backend:$VERSION
docker push $REGISTRY/monitoring-dashboard-backend:latest
docker push $REGISTRY/monitoring-dashboard-frontend:$VERSION
docker push $REGISTRY/monitoring-dashboard-frontend:latest
docker push $REGISTRY/monitoring-dashboard-agent:$VERSION
docker push $REGISTRY/monitoring-dashboard-agent:latest

echo "Imagens construídas e enviadas com sucesso!"
