import { getChannel } from "./rabbitmq.js"
import { processAgentData } from "./postgres.js"
import { logger } from "../utils/logger.js"

export const startConsumer = async () => {
  try {
    const channel = getChannel()

    // Configurar o consumidor para a fila de dados
    await channel.consume(
      process.env.RABBITMQ_QUEUE_DATA,
      async (msg) => {
        if (msg) {
          try {
            const content = msg.content.toString()
            logger.debug("Mensagem recebida:", content)

            // Processar a mensagem
            const data = JSON.parse(content)
            await processAgentData(data)

            // Confirmar o processamento da mensagem
            channel.ack(msg)
            logger.info("Mensagem processada com sucesso")
          } catch (error) {
            // Em caso de erro, rejeitar a mensagem
            channel.nack(msg, false, false)
            logger.error("Erro ao processar mensagem:", error)
          }
        }
      },
      { noAck: false }, // Modo de confirmação manual
    )

    logger.info("Consumidor de mensagens iniciado com sucesso")
  } catch (error) {
    logger.error("Erro ao iniciar consumidor de mensagens:", error)
    throw error
  }
}
