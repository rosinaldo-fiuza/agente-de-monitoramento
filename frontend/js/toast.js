/**
 * Funções para exibição de notificações toast
 */

/**
 * Exibe uma notificação toast
 * @param {string} message - Mensagem a ser exibida
 * @param {string} type - Tipo de notificação (success, error, warning, info)
 * @param {string} title - Título da notificação
 * @param {number} duration - Duração em milissegundos
 */
function showToast(message, type = "info", title = "", duration = 5000) {
  const toastContainer = document.getElementById("toast-container")
  if (!toastContainer) return

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

// Exportar funções
export { showToast, closeToast }
