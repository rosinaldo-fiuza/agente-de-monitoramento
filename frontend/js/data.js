/**
 * Funções para manipulação de dados
 */

import { getAgents, getLatestMetrics } from "./api.js"
import { loadChartData } from "./charts.js"
import { updateAgentsList, updateStatusCards, updateNetworkInfo, updateNoipStatus } from "./ui.js"

/**
 * Atualiza os dados exibidos na interface
 */
async function refreshData() {
  try {
    // Exibir indicador de atualização
    const refreshButton = document.getElementById("refresh-now")
    if (refreshButton) {
      refreshButton.classList.add("rotating")
    }

    // Obter dados atualizados
    const agents = await getAgents()
    const metrics = await getLatestMetrics()

    // Atualizar interface
    updateAgentsList(agents)
    updateStatusCards(metrics)
    updateNetworkInfo(metrics)
    updateNoipStatus(metrics)

    // Atualizar gráficos se houver um agente selecionado
    const selectedAgent = window.selectedAgent
    if (selectedAgent) {
      const cpuChartInterval = document.getElementById("cpu-chart-interval")
      if (cpuChartInterval) {
        loadChartData(selectedAgent.agent_id, cpuChartInterval.value)
      }
    }

    // Remover indicador de atualização
    if (refreshButton) {
      refreshButton.classList.remove("rotating")
    }
  } catch (error) {
    console.error("Erro ao atualizar dados:", error)

    // Remover indicador de atualização em caso de erro
    const refreshButton = document.getElementById("refresh-now")
    if (refreshButton) {
      refreshButton.classList.remove("rotating")
    }
  }
}

// Exportar funções
export { refreshData }
