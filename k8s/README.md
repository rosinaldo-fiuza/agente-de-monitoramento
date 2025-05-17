# Dashboard de Monitoramento para Kubernetes

Este diretório contém os manifestos Kubernetes para implantar o Dashboard de Monitoramento em um cluster Kubernetes.

## Estrutura de Diretórios

\`\`\`
k8s/
├── configmaps/           # ConfigMaps para configurações
├── deployments/          # Deployments, StatefulSets e DaemonSets
├── secrets/              # Secrets para credenciais
├── services/             # Services para expor componentes
├── storage/              # PersistentVolumeClaims
├── deploy.sh             # Script de implantação
├── ingress.yaml          # Ingress para expor o frontend
├── namespace.yaml        # Namespace para o projeto
└── README.md             # Esta documentação
\`\`\`

## Pré-requisitos

- Cluster Kubernetes v1.19+
- kubectl configurado para acessar o cluster
- Ingress Controller instalado no cluster (como NGINX Ingress)
- Registro de contêineres para armazenar as imagens

## Componentes

1. **Agent**: DaemonSet que executa em cada nó do cluster para coletar métricas
2. **Backend**: Deployment que processa dados e fornece API
3. **Frontend**: Deployment que serve a interface web
4. **PostgreSQL**: StatefulSet para armazenamento persistente de dados
5. **RabbitMQ**: StatefulSet para mensageria

## Implantação

### 1. Construir e Enviar Imagens

Antes de implantar, você precisa construir e enviar as imagens para um registro:

\`\`\`bash
# Edite o script para definir seu registro
./build-images.sh
\`\`\`

### 2. Editar Configurações

Edite os seguintes arquivos para personalizar a implantação:

- `configmaps/agent-config.yaml`: Configuração do agente
- `secrets/db-credentials.yaml`: Credenciais do PostgreSQL
- `secrets/rabbitmq-credentials.yaml`: Credenciais do RabbitMQ
- `ingress.yaml`: Domínio para acessar o dashboard

### 3. Implantar

Execute o script de implantação:

\`\`\`bash
./deploy.sh
\`\`\`

### 4. Verificar Status

\`\`\`bash
kubectl get all -n monitoring-dashboard
\`\`\`

## Acesso

Após a implantação, você pode acessar:

- **Dashboard**: http://monitoring.example.com (substitua pelo seu domínio)
- **RabbitMQ Management**: http://monitoring.example.com:15672

## Escalonamento

Para escalonar os componentes:

\`\`\`bash
# Escalonar backend
kubectl scale deployment/backend -n monitoring-dashboard --replicas=3

# Escalonar frontend
kubectl scale deployment/frontend -n monitoring-dashboard --replicas=3
\`\`\`

## Manutenção

### Atualizar Configurações

\`\`\`bash
kubectl apply -f configmaps/agent-config.yaml
\`\`\`

### Reiniciar Componentes

\`\`\`bash
kubectl rollout restart deployment/backend -n monitoring-dashboard
kubectl rollout restart deployment/frontend -n monitoring-dashboard
kubectl rollout restart daemonset/monitoring-agent -n monitoring-dashboard
\`\`\`

### Visualizar Logs

\`\`\`bash
# Logs do backend
kubectl logs -f deployment/backend -n monitoring-dashboard

# Logs do agente em um nó específico
kubectl logs -f daemonset/monitoring-agent -n monitoring-dashboard --selector=kubernetes.io/hostname=node-name
\`\`\`

## Desinstalar

Para remover completamente a aplicação:

\`\`\`bash
kubectl delete namespace monitoring-dashboard
\`\`\`

## Solução de Problemas

### Verificar Conectividade

\`\`\`bash
# Testar conexão com PostgreSQL
kubectl run -it --rm --restart=Never postgres-client --image=postgres:alpine -n monitoring-dashboard -- psql -h postgres -U postgres

# Testar conexão com RabbitMQ
kubectl run -it --rm --restart=Never rabbitmq-client --image=rabbitmq:alpine -n monitoring-dashboard -- rabbitmqctl status
\`\`\`

### Verificar Logs

\`\`\`bash
# Logs do PostgreSQL
kubectl logs -f statefulset/postgres -n monitoring-dashboard

# Logs do RabbitMQ
kubectl logs -f statefulset/rabbitmq -n monitoring-dashboard
