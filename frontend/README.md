# Frontend do Dashboard de Monitoramento

Este é o frontend do Dashboard de Monitoramento, responsável por exibir os dados coletados pelos agentes e permitir a interação com o sistema.

## Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (ES6+)
- Chart.js para gráficos
- Font Awesome para ícones

## Estrutura do Projeto

\`\`\`
frontend/
├── css/
│   └── styles.css          # Estilos da aplicação
├── img/
│   └── avatar.png          # Imagens utilizadas
├── js/
│   ├── api.js              # Funções para comunicação com a API
│   ├── charts.js           # Funções para criação e atualização de gráficos
│   ├── config.js           # Configurações da aplicação
│   ├── main.js             # Arquivo principal
│   ├── ui.js               # Funções para manipulação da interface
│   └── utils.js            # Funções utilitárias
└── index.html              # Página principal
\`\`\`

## Funcionalidades

- Exibição de métricas em tempo real (CPU, memória, disco)
- Visualização de informações de rede (IP público, IP privado, ASN/ORG)
- Gráficos históricos de uso de CPU e memória
- Lista de agentes com status e métricas
- Status do NoIP DUC
- Atualização manual ou automática dos dados
- Atualização forçada de ASN

## Como Usar

1. Abra o arquivo `index.html` em um navegador web moderno
2. O dashboard se conectará automaticamente ao backend
3. Os dados serão atualizados conforme o intervalo selecionado
4. Utilize os botões e controles para interagir com o sistema

## Configuração

As configurações da aplicação estão no arquivo `js/config.js`:

- `API_URL`: URL base da API do backend
- `DEFAULT_REFRESH_INTERVAL`: Intervalo de atualização padrão em segundos
- `CHART_INTERVALS`: Intervalos de tempo para os gráficos
- `MAX_CHART_POINTS`: Número máximo de pontos nos gráficos
- `CHART_COLORS`: Cores utilizadas nos gráficos
- `TOAST_DURATION`: Duração das notificações toast em milissegundos

## Requisitos

- Navegador web moderno com suporte a ES6+
- Backend do Dashboard de Monitoramento em execução
- Conexão com a internet para carregar as bibliotecas externas (Font Awesome e Chart.js)
