#!/bin/bash

# Script para implantar o Dashboard de Monitoramento no Kubernetes

# Definir variáveis
NAMESPACE="monitoring-dashboard"
REGISTRY="your-registry.com"  # Substitua pelo seu registro de contêineres

# Verificar se kubectl está instalado
if ! command -v kubectl &> /dev/null; then
    echo "kubectl não encontrado. Por favor, instale o kubectl primeiro."
    exit 1
fi

# Verificar se o namespace existe
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    echo "Criando namespace $NAMESPACE..."
    kubectl apply -f namespace.yaml
else
    echo "Namespace $NAMESPACE já existe."
fi

# Aplicar ConfigMaps
echo "Aplicando ConfigMaps..."
kubectl apply -f configmaps/agent-config.yaml
kubectl apply -f configmaps/nginx-config.yaml
kubectl apply -f configmaps/postgres-init-script.yaml

# Aplicar Secrets
echo "Aplicando Secrets..."
kubectl apply -f secrets/db-credentials.yaml
kubectl apply -f secrets/rabbitmq-credentials.yaml

# Aplicar PersistentVolumeClaims
echo "Aplicando PersistentVolumeClaims..."
kubectl apply -f storage/postgres-pvc.yaml
kubectl apply -f storage/rabbitmq-pvc.yaml

# Aplicar StatefulSets
echo "Aplicando StatefulSets..."
kubectl apply -f deployments/postgres.yaml
kubectl apply -f deployments/rabbitmq.yaml

# Esperar pelos StatefulSets
echo "Aguardando StatefulSets estarem prontos..."
kubectl rollout status statefulset/postgres -n $NAMESPACE
kubectl rollout status statefulset/rabbitmq -n $NAMESPACE

# Aplicar Serviços
echo "Aplicando Serviços..."
kubectl apply -f services/postgres-service.yaml
kubectl apply -f services/rabbitmq-service.yaml
kubectl apply -f services/backend-service.yaml
kubectl apply -f services/frontend-service.yaml

# Aplicar Deployments
echo "Aplicando Deployments..."
kubectl apply -f deployments/backend.yaml
kubectl apply -f deployments/frontend.yaml

# Aplicar DaemonSet
echo "Aplicando DaemonSet..."
kubectl apply -f deployments/agent.yaml

# Aplicar Ingress
echo "Aplicando Ingress..."
kubectl apply -f ingress.yaml

# Verificar status
echo "Verificando status da implantação..."
kubectl get all -n $NAMESPACE

echo "Implantação concluída!"
echo "Acesse o dashboard em: http://monitoring.example.com"
