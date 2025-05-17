import { query } from "../services/postgres.js"
import { sendCommand } from "../services/rabbitmq.js"

// Enviar comando para atualizar ASN
export const sendUpdateAsnCommand = async (req, res, next) => {
  try {
    const { agentId } = req.params
    const { force } = req.body

    // Verificar se o agente existe
    const agentResult = await query("SELECT agent_id FROM agents WHERE agent_id = $1", [agentId])

    if (agentResult.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Agente não encontrado",
      })
    }

    // Registrar o comando no banco de dados
    const commandResult = await query(
      `INSERT INTO agent_commands (agent_id, command_type, command_data, status)
       VALUES ($1, $2, $3, $4)
       RETURNING command_id`,
      [agentId, "update_asn", { force: !!force }, "pending"],
    )

    const commandId = commandResult.rows[0].command_id

    // Enviar o comando para o RabbitMQ
    await sendCommand(agentId, "update_asn", {
      force: !!force,
      command_id: commandId,
    })

    // Atualizar o status do comando para 'sent'
    await query("UPDATE agent_commands SET sent_at = NOW(), status = $1 WHERE command_id = $2", ["sent", commandId])

    res.status(200).json({
      status: "success",
      message: "Comando de atualização de ASN enviado com sucesso",
      data: {
        command_id: commandId,
        agent_id: agentId,
        command_type: "update_asn",
        force: !!force,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Obter histórico de comandos
export const getCommandHistory = async (req, res, next) => {
  try {
    const { agentId } = req.params
    const { limit, status } = req.query

    let sql = `
      SELECT command_id, command_type, command_data, created_at, 
             sent_at, acknowledged_at, status, result
      FROM agent_commands
      WHERE agent_id = $1
    `

    const params = [agentId]
    let paramIndex = 2

    // Filtrar por status se fornecido
    if (status) {
      sql += ` AND status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    // Ordenar por data de criação
    sql += " ORDER BY created_at DESC"

    // Limitar o número de resultados se fornecido
    if (limit) {
      sql += ` LIMIT $${paramIndex}`
      params.push(Number.parseInt(limit))
    } else {
      // Limite padrão
      sql += " LIMIT 100"
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
