import express from "express"
import cors from "cors"
import helmet from "helmet"
import dotenv from "dotenv"
import { logger } from "./utils/logger.js"
import { connectRabbitMQ } from "./services/rabbitmq.js"
import { connectPostgres } from "./services/postgres.js"
import { errorHandler } from "./middlewares/errorHandler.js"
import { dataRoutes } from "./routes/dataRoutes.js"
import { commandRoutes } from "./routes/commandRoutes.js"
import { startConsumer } from "./services/consumer.js"

// Carregar variáveis de ambiente
dotenv.config()

// Inicializar o aplicativo Express
const app = express()
const port = process.env.PORT || 3000

// Middlewares
app.use(helmet())
app.use(cors())
app.use(express.json())

// Rotas
app.use("/api/data", dataRoutes)
app.use("/api/commands", commandRoutes)

// Rota de saúde
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() })
})

// Middleware de tratamento de erros
app.use(errorHandler)

// Iniciar o servidor
const startServer = async () => {
  try {
    // Conectar ao PostgreSQL
    await connectPostgres()
    logger.info("Conexão com PostgreSQL estabelecida")

    // Conectar ao RabbitMQ
    await connectRabbitMQ()
    logger.info("Conexão com RabbitMQ estabelecida")

    // Iniciar o consumidor de mensagens
    await startConsumer()
    logger.info("Consumidor de mensagens iniciado")

    // Iniciar o servidor HTTP
    app.listen(port, () => {
      logger.info(`Servidor rodando na porta ${port}`)
    })
  } catch (error) {
    logger.error("Erro ao iniciar o servidor:", error)
    process.exit(1)
  }
}

// Tratamento de sinais para encerramento gracioso
process.on("SIGINT", async () => {
  logger.info("Recebido sinal SIGINT. Encerrando aplicação...")
  process.exit(0)
})

process.on("SIGTERM", async () => {
  logger.info("Recebido sinal SIGTERM. Encerrando aplicação...")
  process.exit(0)
})

process.on("uncaughtException", (error) => {
  logger.error("Exceção não tratada:", error)
  process.exit(1)
})

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Rejeição não tratada:", reason)
})

// Iniciar o servidor
startServer()
