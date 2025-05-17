/**
 * Converte bytes para uma representação legível
 * @param {number} bytes - Número de bytes
 * @param {number} decimals - Número de casas decimais
 * @returns {string} - Representação legível
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

/**
 * Calcula a diferença entre duas datas em um formato legível
 * @param {Date} date1 - Data inicial
 * @param {Date} date2 - Data final (padrão: data atual)
 * @returns {string} - Diferença em formato legível
 */
export const timeSince = (date1, date2 = new Date()) => {
  const seconds = Math.floor((date2 - date1) / 1000)

  let interval = seconds / 31536000
  if (interval > 1) {
    return Math.floor(interval) + " anos"
  }

  interval = seconds / 2592000
  if (interval > 1) {
    return Math.floor(interval) + " meses"
  }

  interval = seconds / 86400
  if (interval > 1) {
    return Math.floor(interval) + " dias"
  }

  interval = seconds / 3600
  if (interval > 1) {
    return Math.floor(interval) + " horas"
  }

  interval = seconds / 60
  if (interval > 1) {
    return Math.floor(interval) + " minutos"
  }

  return Math.floor(seconds) + " segundos"
}

/**
 * Verifica se uma string é um UUID válido
 * @param {string} str - String a ser verificada
 * @returns {boolean} - true se for um UUID válido, false caso contrário
 */
export const isValidUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}
