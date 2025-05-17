/**
 * Funções para manipulação da interface do usuário
 */

import { getAgents, getLatestMetrics, sendUpdateAsnCommand } from "./api.js"
import { debounce, formatDate, timeAgo, showModal, showToast } from "./utils.js"
import { loadChartData } from "./charts.js"

/**
 * Inicializa os elementos da interface
 */
function initUI() {
  // Configurar toggle do sidebar
  const sidebarToggle = document.getElementById("sidebar-toggle")
  sidebarToggle.addEventListener("click", toggleSidebar)

  // Configurar intervalo de atualização
  const refreshIntervalSelect = document.getElementById("refresh-interval")
  refreshIntervalSelect.addEventListener("change", updateRefreshInterval)

  // Configurar botão de atualização manual
  const refreshNowButton = document.getElementById("refresh-now")
  refreshNowButton.addEventListener("click", refreshData)

  // Configurar botão de atualização de ASN
  const updateAsnButton = document.getElementById("update-asn")
  updateAsnButton.addEventListener("click", handleUpdateAsn)

  // Configurar seletores de intervalo para os gráficos
  const cpuChartInterval = document.getElementById("cpu-chart-interval")
  cpuChartInterval.addEventListener("change", () => {
    const selectedAgent = getSelectedAgent()
    if (selectedAgent) {
      loadChartData(selectedAgent.agent_id, cpuChartInterval.value)
    }
  })

  const memoryChartInterval = document.getElementById("memory-chart-interval")
  memoryChartInterval.addEventListener("change", () => {
    const selectedAgent = getSelectedAgent()
    if (selectedAgent) {
      loadChartData(selectedAgent.agent_id, memoryChartInterval.value)
    }
  })

  // Configurar campo de busca de agentes
  const agentSearch = document.getElementById("agent-search")
  agentSearch.addEventListener("input", debounce(filterAgents, 300))
}

/**
 * Alterna a visibilidade da sidebar
 */
function toggleSidebar() {
  document.body.classList.toggle("sidebar-collapsed")
}

/**
 * Atualiza o intervalo de atualização automática
 */
function updateRefreshInterval() {
  const refreshIntervalSelect = document.getElementById("refresh-interval")
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

/**
 * Atualiza os dados exibidos na interface
 */
async function refreshData() {
  try {
    // Exibir indicador de atualização
    const refreshButton = document.getElementById("refresh-now")
    refreshButton.classList.add("rotating")

    // Obter dados atualizados
    const agents = await getAgents()
    const metrics = await getLatestMetrics()

    // Atualizar interface
    updateAgentsList(agents)
    updateStatusCards(metrics)
    updateNetworkInfo(metrics)
    updateNoipStatus(metrics)

    // Atualizar gráficos se houver um agente selecionado
    const selectedAgent = getSelectedAgent()
    if (selectedAgent) {
      const cpuChartInterval = document.getElementById("cpu-chart-interval")
      loadChartData(selectedAgent.agent_id, cpuChartInterval.value)
    }

    // Remover indicador de atualização
    refreshButton.classList.remove("rotating")
  } catch (error) {
    console.error("Erro ao atualizar dados:", error)

    // Remover indicador de atualização em caso de erro
    const refreshButton = document.getElementById("refresh-now")
    refreshButton.classList.remove("rotating")
  }
}

/**
 * Atualiza os cards de status com os dados mais recentes
 * @param {Array} metrics - Dados de métricas
 */
function updateStatusCards(metrics) {
  if (!metrics || metrics.length === 0) return

  // Calcular médias
  const activeAgents = metrics.filter(
    (m) => m.last_seen && new Date(m.last_seen) > new Date(Date.now() - 5 * 60 * 1000),
  )
  const avgCpu = activeAgents.reduce((sum, m) => sum + (m.cpu_percent || 0), 0) / (activeAgents.length || 1)
  const avgMemory = activeAgents.reduce((sum, m) => sum + (m.memory_percent || 0), 0) / (activeAgents.length || 1)

  // Atualizar cards
  document.querySelector("#agents-card .card-value").textContent = activeAgents.length
  document.querySelector("#cpu-card .card-value").textContent = `${avgCpu.toFixed(1)}%`
  document.querySelector("#memory-card .card-value").textContent = `${avgMemory.toFixed(1)}%`

  // Atualizar card de disco (usando o primeiro agente como exemplo)
  if (activeAgents.length > 0 && activeAgents[0].disk_percent) {
    document.querySelector("#disk-card .card-value").textContent = `${activeAgents[0].disk_percent.toFixed(1)}%`
  }
}

/**
 * Atualiza as informações de rede
 * @param {Array} metrics - Dados de métricas
 */
function updateNetworkInfo(metrics) {
  if (!metrics || metrics.length === 0) return

  // Usar o primeiro agente ativo como exemplo
  const activeAgent = metrics.find((m) => m.last_seen && new Date(m.last_seen) > new Date(Date.now() - 5 * 60 * 1000))

  if (activeAgent) {
    document.getElementById("public-ip").textContent = activeAgent.public_ip || "-"
    document.getElementById("private-ip").textContent = activeAgent.private_ip || "-"
    document.getElementById("asn").textContent = activeAgent.asn || "-"
    document.getElementById("organization").textContent = activeAgent.organization || "-"

    // Combinar país, região e cidade
    const location = [activeAgent.country, activeAgent.region, activeAgent.city].filter(Boolean).join(", ") || "-"

    document.getElementById("location").textContent = location
    document.getElementById("last-update").textContent = activeAgent.last_seen ? formatDate(activeAgent.last_seen) : "-"
  }
}

/**
 * Atualiza o status do NoIP DUC
 * @param {Array} metrics - Dados de métricas
 */
function updateNoipStatus(metrics) {
  if (!metrics || metrics.length === 0) return

  // Usar o primeiro agente ativo como exemplo
  const activeAgent = metrics.find((m) => m.last_seen && new Date(m.last_seen) > new Date(Date.now() - 5 * 60 * 1000))

  if (activeAgent && activeAgent.noip_duc) {
    const noip = activeAgent.noip_duc

    document.getElementById("noip-installed").textContent = noip.installed ? "Sim" : "Não"
    document.getElementById("noip-running").textContent = noip.running ? "Sim" : "Não"
    document.getElementById("noip-service").textContent = noip.service_active ? "Sim" : "Não"
    document.getElementById("noip-version").textContent = noip.version || "-"
    document.getElementById("noip-path").textContent = noip.install_path || "-"
    document.getElementById("noip-last-update").textContent = noip.last_update ? formatDate(noip.last_update) : "-"
  }
}

/**
 * Atualiza a lista de agentes
 * @param {Array} agents - Lista de agentes
 */
function updateAgentsList(agents) {
  if (!agents || agents.length === 0) return

  const tableBody = document.getElementById("agents-table-body")
  tableBody.innerHTML = ""

  agents.forEach((agent) => {
    const row = document.createElement("tr")

    // Calcular status
    const isActive = agent.last_seen && new Date(agent.last_seen) > new Date(Date.now() - 5 * 60 * 1000)
    const statusClass = isActive ? "status-online" : "status-offline"
    const statusText = isActive ? "Online" : "Offline"

    row.innerHTML = `
            <td>${agent.hostname}</td>
            <td>${agent.private_ip || "-"}</td>
            <td>${agent.cpu_percent ? agent.cpu_percent.toFixed(1) + "%" : "-"}</td>
            <td>${agent.memory_percent ? agent.memory_percent.toFixed(1) + "%" : "-"}</td>
            <td>${agent.last_seen ? timeAgo(agent.last_seen) : "-"}</td>
            <td><span class="agent-status ${statusClass}">${statusText}</span></td>
            <td class="agent-actions">
                <button class="btn btn-sm btn-primary view-agent" data-agent-id="${agent.agent_id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-info update-asn-agent" data-agent-id="${agent.agent_id}">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </td>
        `

    // Adicionar evento para visualizar detalhes do agente
    const viewButton = row.querySelector(".view-agent")
    viewButton.addEventListener("click", () => selectAgent(agent))

    // Adicionar evento para atualizar ASN do agente
    const updateAsnButton = row.querySelector(".update-asn-agent")
    updateAsnButton.addEventListener("click", () => handleUpdateAsn(agent.agent_id))

    tableBody.appendChild(row)
  })
}

/**
 * Filtra a lista de agentes com base no texto de busca
 */
function filterAgents() {
  const searchInput = document.getElementById("agent-search")
  const searchText = searchInput.value.toLowerCase()
  const rows = document.querySelectorAll("#agents-table-body tr")

  rows.forEach((row) => {
    const hostname = row.cells[0].textContent.toLowerCase()
    const ip = row.cells[1].textContent.toLowerCase()

    if (hostname.includes(searchText) || ip.includes(searchText)) {
      row.style.display = ""
    } else {
      row.style.display = "none"
    }
  })
}

/**
 * Seleciona um agente para exibir detalhes
 * @param {Object} agent - Dados do agente
 */
function selectAgent(agent) {
  // Armazenar o agente selecionado
  window.selectedAgent = agent

  // Carregar dados para os gráficos
  const cpuChartInterval = document.getElementById("cpu-chart-interval")
  loadChartData(agent.agent_id, cpuChartInterval.value)

  // Exibir notificação
  showToast(`Agente ${agent.hostname} selecionado`, "info")
}

/**
 * Obtém o agente atualmente selecionado
 * @returns {Object|null} Agente selecionado ou null
 */
function getSelectedAgent() {
  return window.selectedAgent || null
}

/**
 * Manipula o clique no botão de atualização de ASN
 * @param {string} agentId - ID do agente (opcional)
 */
function handleUpdateAsn(agentId = null) {
  // Se não foi fornecido um ID, usar o agente selecionado ou o primeiro da lista
  if (!agentId) {
    const selectedAgent = getSelectedAgent()
    if (selectedAgent) {
      agentId = selectedAgent.agent_id
    } else {
      showToast("Selecione um agente primeiro", "warning")
      return
    }
  }

  // Confirmar a ação
  showModal("Atualizar ASN", "Tem certeza que deseja forçar a atualização do ASN para este agente?", async () => {
    try {
      await sendUpdateAsnCommand(agentId, true)
      // Atualizar dados após um breve intervalo
      setTimeout(refreshData, 2000)
    } catch (error) {
      console.error("Erro ao atualizar ASN:", error)
    }
  })
}

// Exportar funções
export { initUI, toggleSidebar, updateRefreshInterval, refreshData, handleUpdateAsn }
