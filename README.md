# Dashboard de Monitoramento - Versão para Deploy Manual

Este projeto consiste em um sistema de monitoramento com:
- **Backend**: Node.js executando em servidor Debian
- **Frontend**: HTML/CSS/JS servido por Nginx em servidor Debian
- **Banco de Dados**: PostgreSQL em servidor Debian
- **Mensageria**: RabbitMQ em servidor Debian
- **Agente**: Aplicação Python para Windows 11 com ícone na system tray

## Tecnologias Utilizadas

- Node.js
- Express
- PostgreSQL
- RabbitMQ
- Docker

## Estrutura do Projeto

```
dashboard-monitoramento/
├── agent/                  # Agente para Windows
│   ├── agent_windows.py    # Código do agente
│   ├── config.yaml         # Configuração do agente
│   ├── install.bat         # Script de instalação
│   ├── requirements.txt    # Dependências Python
│   └── run.bat             # Script para execução manual
├── backend/                # Backend Node.js
│   ├── src/                # Código-fonte
│   │   ├── controllers/       # Controladores da API
│   │   ├── middlewares/       # Middlewares do Express
│   │   ├── routes/            # Rotas da API
│   │   ├── services/          # Serviços (PostgreSQL, RabbitMQ)
│   │   ├── utils/             # Utilitários
│   │   └── index.js           # Ponto de entrada da aplicação
│   ├── package.json        # Dependências Node.js
│   └── schema.sql          # Esquema do banco de dados
├── debian/                 # Scripts para Debian
│   ├── install.sh          # Script de instalação
│   ├── start.sh            # Iniciar serviços
│   ├── stop.sh             # Parar serviços
│   ├── status.sh           # Verificar status
│   └── logs.sh             # Visualizar logs
├── frontend/               # Frontend HTML/CSS/JS
│   ├── css/                # Estilos
│   ├── js/                 # JavaScript
│   └── index.html          # Página principal
└── README.md               # Este arquivo
```

## Requisitos

### Servidor Debian
- Debian 11 ou superior
- Acesso root
- Portas 80 (HTTP), 5432 (PostgreSQL), 5672 (RabbitMQ), 15672 (RabbitMQ Management) liberadas

### Cliente Windows
- Windows 11
- Python 3.8 ou superior
- Acesso à rede do servidor Debian

## Instalação

### Servidor Debian

1. Clone este repositório:
   ```bash
   git clone https://github.com/seu-usuario/dashboard-monitoramento.git
   cd dashboard-monitoramento
   ```

2. Execute o script de instalação:
   ```bash
   chmod +x debian/install.sh
   sudo ./debian/install.sh
   ```

3. Verifique se todos os serviços estão em execução:
   ```bash
   sudo ./debian/status.sh
   ```

### Cliente Windows

1. Copie a pasta `agent` para o computador Windows

2. Edite o arquivo `config.yaml` e atualize o IP do servidor Debian:
   ```yaml
   rabbitmq:
     host: "192.168.1.100"  # Substitua pelo IP do seu servidor Debian
   
   dashboard:
     url: "http://192.168.1.100"  # Substitua pelo IP do seu servidor Debian
   ```

3. Execute o script de instalação:
   ```
   install.bat
   ```

4. Para iniciar o agente manualmente:
   ```
   run.bat
   ```

## Uso

### Servidor Debian

- **Iniciar serviços**: `sudo ./debian/start.sh`
- **Parar serviços**: `sudo ./debian/stop.sh`
- **Verificar status**: `sudo ./debian/status.sh`
- **Visualizar logs**: `sudo ./debian/logs.sh`

### Cliente Windows

- O agente será iniciado automaticamente na inicialização do Windows
- Um ícone será exibido na área de notificação (system tray)
- Clique com o botão direito no ícone para acessar o menu:
  - **Status**: Exibe informações sobre o agente
  - **Abrir Dashboard**: Abre o dashboard no navegador
  - **Forçar Atualização ASN**: Atualiza as informações de ASN
  - **Reiniciar Agente**: Reinicia o agente
  - **Sair**: Encerra o agente

## Cores do Ícone na System Tray

- **Cinza**: Desconectado
- **Amarelo**: Conectando
- **Verde**: Conectado
- **Vermelho**: Erro

## Acesso ao Dashboard

- **URL**: `http://IP-DO-SERVIDOR`
- **RabbitMQ Management**: `http://IP-DO-SERVIDOR:15672`
  - Usuário: `admin`
  - Senha: `a1b23fec99VMB`

## Solução de Problemas

### Servidor Debian

- **Serviços não iniciam**: Verifique os logs com `sudo ./debian/logs.sh`
- **Dashboard não acessível**: Verifique se o Nginx está em execução com `sudo systemctl status nginx`
- **Dados não aparecem**: Verifique se o backend está em execução com `sudo systemctl status monitoring-backend`

### Cliente Windows

- **Ícone não aparece**: Execute `run.bat` manualmente
- **Ícone vermelho**: Verifique a conectividade com o servidor Debian
- **Erro de conexão**: Verifique se o RabbitMQ está em execução no servidor Debian

## Variáveis de Ambiente

```
# Configurações do servidor
PORT=3000
NODE_ENV=development

# Configurações do RabbitMQ
RABBITMQ_HOST=172.17.253.10
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=a1b23fec99VMB
RABBITMQ_VHOST=/
RABBITMQ_QUEUE_DATA=agent_data
RABBITMQ_QUEUE_COMMANDS=agent_commands

# Configurações do PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=monitoring_dashboard
```

## API Endpoints

### Dados

- `GET /api/data/agents` - Obter todos os agentes
- `GET /api/data/latest` - Obter as métricas mais recentes de todos os agentes
- `GET /api/data/latest/:agentId` - Obter as métricas mais recentes de um agente específico
- `GET /api/data/history/:agentId/:metricType` - Obter o histórico de métricas de um agente

### Comandos

- `POST /api/commands/update-asn/:agentId` - Enviar comando para atualizar ASN
- `GET /api/commands/history/:agentId` - Obter o histórico de comandos de um agente

## Fluxo de Dados

1. O agente Python coleta métricas e envia para a fila `agent_data` no RabbitMQ
2. O backend consome as mensagens da fila `agent_data`
3. O backend processa os dados e os armazena no PostgreSQL
4. O frontend solicita dados ao backend através dos endpoints da API
5. O backend consulta o PostgreSQL e retorna os dados para o frontend
6. O frontend pode enviar comandos para o agente através do backend
7. O backend envia os comandos para a fila `agent_commands` no RabbitMQ
8. O agente consome os comandos da fila `agent_commands` e os executa

## Logs

Os logs são armazenados no diretório `logs/`:

- `logs/combined.log` - Todos os logs
- `logs/error.log` - Apenas logs de erro

## Segurança

- Este projeto usa credenciais padrão para fins de demonstração
- Em ambiente de produção, altere as senhas nos seguintes arquivos:
  - `debian/install.sh`: Senhas do PostgreSQL e RabbitMQ
  - `agent/config.yaml`: Senha do RabbitMQ

## Licença

Este projeto está licenciado sob a licença MIT.
