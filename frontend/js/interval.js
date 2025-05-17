/**
 * Funções para gerenciamento de intervalos de atualização
 */

import { refreshData } from "./data.js"

/**
 * Atualiza o intervalo de atualização automática
 */
function updateRefreshInterval() {
  const refreshIntervalSelect = document.getElementById("refresh-interval")
  if (!refreshIntervalSelect) return

  const interval = Number.parseInt(refreshIntervalSelect.value, 10)

  // Limpar intervalo existente
  if (window.refreshTimer) {
    clearInterval(window.refreshTimer)
    window.refreshTimer = null
  }

  // Configurar novo intervalo se não for manual
  if (interval > 0) {
    window.refreshTimer = setInterval(refreshData, interval * 1000)
  }
}

// Exportar funções
export { updateRefreshInterval }
