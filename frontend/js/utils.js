/**
 * Utilitários para o frontend
 */

const CONFIG = {
  TOAST_DURATION: 3000, // Exemplo de valor para TOAST_DURATION
}

/**
 * Formata uma data para exibição
 * @param {string|Date} date - Data a ser formatada
 * @param {boolean} includeTime - Se deve incluir a hora
 * @returns {string} Data formatada
 */
function formatDate(date, includeTime = true) {
  if (!date) return "-"

  const d = new Date(date)
  if (isNaN(d.getTime())) return "-"

  const options = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }

  if (includeTime) {
    options.hour = "2-digit"
    options.minute = "2-digit"
    options.second = "2-digit"
  }

  return d.toLocaleDateString("pt-BR", options)
}

/**
 * Calcula o tempo decorrido desde uma data
 * @param {string|Date} date - Data de referência
 * @returns {string} Tempo decorrido formatado
 */
function timeAgo(date) {
  if (!date) return "-"

  const d = new Date(date)
  if (isNaN(d.getTime())) return "-"

  const now = new Date()
  const seconds = Math.floor((now - d) / 1000)

  if (seconds < 60) {
    return `${seconds} segundo${seconds !== 1 ? "s" : ""} atrás`
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} minuto${minutes !== 1 ? "s" : ""} atrás`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} hora${hours !== 1 ? "s" : ""} atrás`
  }

  const days = Math.floor(hours / 24)
  if (days < 30) {
    return `${days} dia${days !== 1 ? "s" : ""} atrás`
  }

  const months = Math.floor(days / 30)
  if (months < 12) {
    return `${months} mês${months !== 1 ? "es" : ""} atrás`
  }

  const years = Math.floor(months / 12)
  return `${years} ano${years !== 1 ? "s" : ""} atrás`
}

/**
 * Formata bytes para uma unidade legível
 * @param {number} bytes - Número de bytes
 * @param {number} decimals - Número de casas decimais
 * @returns {string} Valor formatado
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

/**
 * Exibe uma notificação toast
 * @param {string} message - Mensagem a ser exibida
 * @param {string} type - Tipo de notificação (success, error, warning, info)
 * @param {string} title - Título da notificação
 * @param {number} duration - Duração em milissegundos
 */
function showToast(message, type = "info", title = "", duration = CONFIG.TOAST_DURATION) {
  const toastContainer = document.getElementById("toast-container")

  // Criar elemento toast
  const toast = document.createElement("div")
  toast.className = `toast toast-${type}`

  // Ícone baseado no tipo
  let icon = ""
  switch (type) {
    case "success":
      icon = "check-circle"
      title = title || "Sucesso"
      break
    case "error":
      icon = "x-circle"
      title = title || "Erro"
      break
    case "warning":
      icon = "alert-triangle"
      title = title || "Atenção"
      break
    case "info":
    default:
      icon = "info"
      title = title || "Informação"
      break
  }

  // Conteúdo do toast
  toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
    `

  // Adicionar ao container
  toastContainer.appendChild(toast)

  // Configurar fechamento
  const closeBtn = toast.querySelector(".toast-close")
  closeBtn.addEventListener("click", () => {
    closeToast(toast)
  })

  // Auto-fechamento após duração
  setTimeout(() => {
    closeToast(toast)
  }, duration)
}

/**
 * Fecha uma notificação toast
 * @param {HTMLElement} toast - Elemento toast a ser fechado
 */
function closeToast(toast) {
  toast.style.animation = "slideOut 0.3s ease-out forwards"
  setTimeout(() => {
    toast.remove()
  }, 300)
}

/**
 * Exibe um modal
 * @param {string} title - Título do modal
 * @param {string|HTMLElement} content - Conteúdo do modal
 * @param {Function} onConfirm - Função a ser executada ao confirmar
 * @param {Function} onCancel - Função a ser executada ao cancelar
 * @param {string} confirmText - Texto do botão de confirmação
 * @param {string} cancelText - Texto do botão de cancelamento
 */
function showModal(
  title,
  content,
  onConfirm = null,
  onCancel = null,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
) {
  const modal = document.getElementById("modal")
  const modalTitle = document.getElementById("modal-title")
  const modalBody = document.getElementById("modal-body")
  const modalConfirm = document.getElementById("modal-confirm")
  const modalCancel = document.getElementById("modal-cancel")
  const modalClose = document.getElementById("modal-close")

  // Configurar conteúdo
  modalTitle.textContent = title

  if (typeof content === "string") {
    modalBody.innerHTML = content
  } else {
    modalBody.innerHTML = ""
    modalBody.appendChild(content)
  }

  // Configurar botões
  modalConfirm.textContent = confirmText
  modalCancel.textContent = cancelText

  // Configurar eventos
  modalConfirm.onclick = () => {
    if (onConfirm) onConfirm()
    closeModal()
  }

  modalCancel.onclick = () => {
    if (onCancel) onCancel()
    closeModal()
  }

  modalClose.onclick = () => {
    if (onCancel) onCancel()
    closeModal()
  }

  // Exibir modal
  modal.classList.add("show")
}

/**
 * Fecha o modal
 */
function closeModal() {
  const modal = document.getElementById("modal")
  modal.classList.remove("show")
}

/**
 * Debounce para limitar a frequência de execução de uma função
 * @param {Function} func - Função a ser executada
 * @param {number} wait - Tempo de espera em milissegundos
 * @returns {Function} Função com debounce
 */
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Exportar funções
export { formatDate, timeAgo, formatBytes, showToast, showModal, closeModal, debounce }
