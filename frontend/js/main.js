/**
 * Arquivo principal do frontend
 */

// Importações necessárias
import { initUI } from "./ui.js"
import { initCharts } from "./charts.js"
import { refreshData } from "./data.js"
import { updateRefreshInterval } from "./interval.js"
import { showToast } from "./toast.js"

// Variáveis globais
window.refreshTimer = null
window.selectedAgent = null

/**
 * Inicializa a aplicação
 */
async function initApp() {
  try {
    // Inicializar interface
    initUI()

    // Inicializar gráficos
    initCharts()

    // Carregar dados iniciais
    await refreshData()

    // Configurar intervalo de atualização
    updateRefreshInterval()

    console.log("Aplicação inicializada com sucesso")
  } catch (error) {
    console.error("Erro ao inicializar aplicação:", error)
    showToast("Erro ao inicializar aplicação. Verifique o console para mais detalhes.", "error")
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", initApp)

// Tratar erros não capturados
window.addEventListener("error", (event) => {
  console.error("Erro não capturado:", event.error)
  showToast("Ocorreu um erro inesperado. Verifique o console para mais detalhes.", "error")
})
