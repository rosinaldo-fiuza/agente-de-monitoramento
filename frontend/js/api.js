/**
 * Funções para comunicação com a API
 */

// Import CONFIG and showToast
import { CONFIG } from "./config"
import { showToast } from "./utils"

/**
 * Realiza uma requisição para a API
 * @param {string} endpoint - Endpoint da API
 * @param {Object} options - Opções da requisição
 * @returns {Promise<Object>} Resposta da API
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${CONFIG.API_URL}${endpoint}`

  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
    },
  }

  const requestOptions = { ...defaultOptions, ...options }

  try {
    const response = await fetch(url, requestOptions)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Erro na requisição para ${url}:`, error)
    throw error
  }
}

/**
 * Obtém a lista de agentes
 * @returns {Promise<Array>} Lista de agentes
 */
async function getAgents() {
  try {
    const response = await apiRequest("/data/agents")
    return response.data
  } catch (error) {
    showToast(`Erro ao obter agentes: ${error.message}`, "error")
    return []
  }
}

/**
 * Obtém as métricas mais recentes de todos os agentes
 * @returns {Promise<Array>} Métricas mais recentes
 */
async function getLatestMetrics() {
  try {
    const response = await apiRequest("/data/latest")
    return response.data
  } catch (error) {
    showToast(`Erro ao obter métricas recentes: ${error.message}`, "error")
    return []
  }
}

/**
 * Obtém as métricas mais recentes de um agente específico
 * @param {string} agentId - ID do agente
 * @returns {Promise<Object>} Métricas do agente
 */
async function getAgentMetrics(agentId) {
  try {
    const response = await apiRequest(`/data/latest/${agentId}`)
    return response.data
  } catch (error) {
    showToast(`Erro ao obter métricas do agente: ${error.message}`, "error")
    return null
  }
}

/**
 * Obtém o histórico de métricas de um agente
 * @param {string} agentId - ID do agente
 * @param {string} metricType - Tipo de métrica (cpu, memory, disk, network, temperature)
 * @param {Object} params - Parâmetros adicionais (start, end, limit)
 * @returns {Promise<Array>} Histórico de métricas
 */
async function getMetricsHistory(agentId, metricType, params = {}) {
  try {
    const queryParams = new URLSearchParams()

    if (params.start) queryParams.append("start", params.start)
    if (params.end) queryParams.append("end", params.end)
    if (params.limit) queryParams.append("limit", params.limit)

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ""
    const response = await apiRequest(`/data/history/${agentId}/${metricType}${queryString}`)

    return response.data
  } catch (error) {
    showToast(`Erro ao obter histórico de métricas: ${error.message}`, "error")
    return []
  }
}

/**
 * Envia comando para atualizar ASN
 * @param {string} agentId - ID do agente
 * @param {boolean} force - Se deve forçar a atualização
 * @returns {Promise<Object>} Resultado do comando
 */
async function sendUpdateAsnCommand(agentId, force = true) {
  try {
    const response = await apiRequest(`/commands/update-asn/${agentId}`, {
      method: "POST",
      body: JSON.stringify({ force }),
    })

    showToast("Comando de atualização de ASN enviado com sucesso", "success")
    return response.data
  } catch (error) {
    showToast(`Erro ao enviar comando: ${error.message}`, "error")
    throw error
  }
}

/**
 * Obtém o histórico de comandos de um agente
 * @param {string} agentId - ID do agente
 * @param {Object} params - Parâmetros adicionais (limit, status)
 * @returns {Promise<Array>} Histórico de comandos
 */
async function getCommandHistory(agentId, params = {}) {
  try {
    const queryParams = new URLSearchParams()

    if (params.limit) queryParams.append("limit", params.limit)
    if (params.status) queryParams.append("status", params.status)

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ""
    const response = await apiRequest(`/commands/history/${agentId}${queryString}`)

    return response.data
  } catch (error) {
    showToast(`Erro ao obter histórico de comandos: ${error.message}`, "error")
    return []
  }
}

// Exportar funções
export { getAgents, getLatestMetrics, getAgentMetrics, getMetricsHistory, sendUpdateAsnCommand, getCommandHistory }
