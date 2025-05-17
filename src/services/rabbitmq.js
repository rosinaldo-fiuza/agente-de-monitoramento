import amqplib from "amqplib"
import { logger } from "../utils/logger.js"

let connection
let channel

export const connectRabbitMQ = async () => {
  try {
    const url = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}${process.env.RABBITMQ_VHOST}`

    connection = await amqplib.connect(url)
    channel = await connection.createChannel()

    // Garantir que as filas existam
    await channel.assertQueue(process.env.RABBITMQ_QUEUE_DATA, { durable: true })
    await channel.assertQueue(process.env.RABBITMQ_QUEUE_COMMANDS, { durable: true })

    logger.info("Conexão com RabbitMQ estabelecida com sucesso")

    // Configurar tratamento de erros e reconexão
    connection.on("error", (err) => {
      logger.error("Erro na conexão RabbitMQ:", err)
      setTimeout(connectRabbitMQ, 5000)
    })

    connection.on("close", () => {
      logger.warn("Conexão RabbitMQ fechada. Tentando reconectar...")
      setTimeout(connectRabbitMQ, 5000)
    })

    return { connection, channel }
  } catch (error) {
    logger.error("Erro ao conectar ao RabbitMQ:", error)
    setTimeout(connectRabbitMQ, 5000)
    throw error
  }
}

export const getChannel = () => {
  if (!channel) {
    throw new Error("Canal RabbitMQ não inicializado")
  }
  return channel
}

export const sendCommand = async (agentId, commandType, commandData = {}) => {
  try {
    const channel = getChannel()
    const message = {
      agent_id: agentId,
      command_type: commandType,
      command_data: commandData,
      timestamp: new Date().toISOString(),
    }

    const result = await channel.sendToQueue(
      process.env.RABBITMQ_QUEUE_COMMANDS,
      Buffer.from(JSON.stringify(message)),
      { persistent: true },
    )

    logger.info(`Comando enviado para o agente ${agentId}:`, { commandType, commandData })
    return result
  } catch (error) {
    logger.error(`Erro ao enviar comando para o agente ${agentId}:`, error)
    throw error
  }
}
