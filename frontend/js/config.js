/**
 * Configurações do frontend
 */
const CONFIG = {
  // URL base da API
  API_URL: "http://localhost:3000/api",

  // Intervalo de atualização padrão em segundos
  DEFAULT_REFRESH_INTERVAL: 5,

  // Intervalo de tempo para os gráficos
  CHART_INTERVALS: {
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
  },

  // Número máximo de pontos nos gráficos
  MAX_CHART_POINTS: 100,

  // Cores para os gráficos
  CHART_COLORS: {
    cpu: {
      borderColor: "rgba(74, 108, 247, 1)",
      backgroundColor: "rgba(74, 108, 247, 0.1)",
    },
    memory: {
      borderColor: "rgba(40, 167, 69, 1)",
      backgroundColor: "rgba(40, 167, 69, 0.1)",
    },
    disk: {
      borderColor: "rgba(255, 193, 7, 1)",
      backgroundColor: "rgba(255, 193, 7, 0.1)",
    },
    network: {
      sent: {
        borderColor: "rgba(220, 53, 69, 1)",
        backgroundColor: "rgba(220, 53, 69, 0.1)",
      },
      received: {
        borderColor: "rgba(23, 162, 184, 1)",
        backgroundColor: "rgba(23, 162, 184, 0.1)",
      },
    },
  },

  // Duração das notificações toast em milissegundos
  TOAST_DURATION: 5000,
}

// Exportar configurações para uso em módulos ES
if (typeof window !== "undefined") {
  window.CONFIG = CONFIG
}
