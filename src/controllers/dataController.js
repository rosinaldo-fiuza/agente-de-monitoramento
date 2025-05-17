import { query } from "../services/postgres.js"

// Obter todos os agentes
export const getAgents = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT agent_id, hostname, agent_version, os_info, 
             first_seen, last_seen, is_active
      FROM agents
      ORDER BY hostname
    `)

    res.status(200).json({
      status: "success",
      data: result.rows,
    })
  } catch (error) {
    next(error)
  }
}

// Obter as métricas mais recentes
export const getLatestMetrics = async (req, res, next) => {
  try {
    const { agentId } = req.params
    let sql
    let params = []

    if (agentId) {
      sql = "SELECT * FROM latest_metrics WHERE agent_id = $1"
      params = [agentId]
    } else {
      sql = "SELECT * FROM latest_metrics"
    }

    const result = await query(sql, params)

    // Se for solicitado um agente específico e não encontrar, retornar 404
    if (agentId && result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Agente não encontrado",
      })
    }

    res.status(200).json({
      status: "success",
      data: agentId ? result.rows[0] : result.rows,
    })
  } catch (error) {
    next(error)
  }
}

// Obter histórico de métricas
export const getMetricsHistory = async (req, res, next) => {
  try {
    const { agentId, metricType } = req.params
    const { start, end, limit } = req.query

    // Validar o tipo de métrica
    const validMetricTypes = ["cpu", "memory", "disk", "network", "temperature"]
    if (!validMetricTypes.includes(metricType)) {
      return res.status(400).json({
        status: "error",
        message: `Tipo de métrica inválido. Valores válidos: ${validMetricTypes.join(", ")}`,
      })
    }

    // Construir a consulta SQL com base no tipo de métrica
    let sql
    const params = [agentId]
    let paramIndex = 2

    // Parte inicial da consulta
    if (metricType === "cpu") {
      sql = `
        SELECT timestamp, cpu_percent, load_avg_1min, load_avg_5min, load_avg_15min
        FROM cpu_metrics
        WHERE agent_id = $1
      `
    } else if (metricType === "memory") {
      sql = `
        SELECT timestamp, percent, used_gb, total_gb, free_gb
        FROM memory_metrics
        WHERE agent_id = $1
      `
    } else if (metricType === "disk") {
      sql = `
        SELECT timestamp, device, mountpoint, percent, used_gb, total_gb, free_gb
        FROM disk_metrics
        WHERE agent_id = $1
      `
    } else if (metricType === "network") {
      sql = `
        SELECT timestamp, interface_name, bytes_sent, bytes_recv, packets_sent, packets_recv
        FROM network_metrics
        WHERE agent_id = $1
      `
    } else if (metricType === "temperature") {
      sql = `
        SELECT timestamp, sensor_name, temperature
        FROM temperature_metrics
        WHERE agent_id = $1
      `
    }

    // Adicionar filtros de data se fornecidos
    if (start) {
      sql += ` AND timestamp >= $${paramIndex}`
      params.push(new Date(start))
      paramIndex++
    }

    if (end) {
      sql += ` AND timestamp <= $${paramIndex}`
      params.push(new Date(end))
      paramIndex++
    }

    // Ordenar por timestamp
    sql += " ORDER BY timestamp DESC"

    // Limitar o número de resultados se fornecido
    if (limit) {
      sql += ` LIMIT $${paramIndex}`
      params.push(Number.parseInt(limit))
    } else {
      // Limite padrão para evitar sobrecarga
      sql += " LIMIT 1000"
    }

    const result = await query(sql, params)

    res.status(200).json({
      status: "success",
      data: result.rows,
    })
  } catch (error) {
    next(error)
  }
}
