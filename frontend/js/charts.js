import { Chart } from "@/components/ui/chart"
/**
 * Funções para criação e atualização de gráficos
 */

// Importar variáveis necessárias
import { CONFIG, formatDate, getMetricsHistory } from "./config.js"

// Armazenar instâncias de gráficos
const charts = {
  cpu: null,
  memory: null,
}

/**
 * Inicializa os gráficos
 */
function initCharts() {
  // Configuração comum para os gráficos
  Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  Chart.defaults.font.size = 12
  Chart.defaults.color = "#6c757d"

  // Inicializar gráfico de CPU
  initCpuChart()

  // Inicializar gráfico de memória
  initMemoryChart()
}

/**
 * Inicializa o gráfico de CPU
 */
function initCpuChart() {
  const ctx = document.getElementById("cpu-chart").getContext("2d")

  charts.cpu = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "CPU (%)",
          data: [],
          borderColor: CONFIG.CHART_COLORS.cpu.borderColor,
          backgroundColor: CONFIG.CHART_COLORS.cpu.backgroundColor,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: (context) => `CPU: ${context.parsed.y.toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            maxTicksLimit: 8,
          },
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value) => value + "%",
          },
        },
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
    },
  })
}

/**
 * Inicializa o gráfico de memória
 */
function initMemoryChart() {
  const ctx = document.getElementById("memory-chart").getContext("2d")

  charts.memory = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Memória (%)",
          data: [],
          borderColor: CONFIG.CHART_COLORS.memory.borderColor,
          backgroundColor: CONFIG.CHART_COLORS.memory.backgroundColor,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: (context) => `Memória: ${context.parsed.y.toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            maxTicksLimit: 8,
          },
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value) => value + "%",
          },
        },
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
    },
  })
}

/**
 * Atualiza o gráfico de CPU com novos dados
 * @param {Array} data - Dados de histórico de CPU
 */
function updateCpuChart(data) {
  if (!charts.cpu || !data || data.length === 0) return

  // Ordenar dados por timestamp
  const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  // Limitar número de pontos
  const limitedData = sortedData.slice(-CONFIG.MAX_CHART_POINTS)

  // Preparar dados para o gráfico
  const labels = limitedData.map((item) => formatDate(item.timestamp, true))
  const values = limitedData.map((item) => item.cpu_percent)

  // Atualizar gráfico
  charts.cpu.data.labels = labels
  charts.cpu.data.datasets[0].data = values
  charts.cpu.update()
}

/**
 * Atualiza o gráfico de memória com novos dados
 * @param {Array} data - Dados de histórico de memória
 */
function updateMemoryChart(data) {
  if (!charts.memory || !data || data.length === 0) return

  // Ordenar dados por timestamp
  const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  // Limitar número de pontos
  const limitedData = sortedData.slice(-CONFIG.MAX_CHART_POINTS)

  // Preparar dados para o gráfico
  const labels = limitedData.map((item) => formatDate(item.timestamp, true))
  const values = limitedData.map((item) => item.percent)

  // Atualizar gráfico
  charts.memory.data.labels = labels
  charts.memory.data.datasets[0].data = values
  charts.memory.update()
}

/**
 * Carrega dados históricos para os gráficos
 * @param {string} agentId - ID do agente
 * @param {string} interval - Intervalo de tempo (1h, 6h, 24h)
 */
async function loadChartData(agentId, interval = "24h") {
  try {
    // Calcular datas de início e fim
    const end = new Date()
    const start = new Date(end.getTime() - CONFIG.CHART_INTERVALS[interval])

    // Parâmetros para a consulta
    const params = {
      start: start.toISOString(),
      end: end.toISOString(),
      limit: CONFIG.MAX_CHART_POINTS,
    }

    // Carregar dados de CPU
    const cpuData = await getMetricsHistory(agentId, "cpu", params)
    updateCpuChart(cpuData)

    // Carregar dados de memória
    const memoryData = await getMetricsHistory(agentId, "memory", params)
    updateMemoryChart(memoryData)
  } catch (error) {
    console.error("Erro ao carregar dados para os gráficos:", error)
  }
}

// Exportar funções
export { initCharts, updateCpuChart, updateMemoryChart, loadChartData }
