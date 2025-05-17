import pg from "pg"
import { logger } from "../utils/logger.js"

const { Pool } = pg

let pool

export const connectPostgres = async () => {
  try {
    pool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    // Testar a conexão
    const client = await pool.connect()
    client.release()
    logger.info("Conexão com PostgreSQL estabelecida com sucesso")
    return pool
  } catch (error) {
    logger.error("Erro ao conectar ao PostgreSQL:", error)
    throw error
  }
}

export const getPool = () => {
  if (!pool) {
    throw new Error("Pool de conexão PostgreSQL não inicializado")
  }
  return pool
}

export const query = async (text, params) => {
  const start = Date.now()
  try {
    const res = await getPool().query(text, params)
    const duration = Date.now() - start
    logger.debug("Consulta executada", { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    logger.error("Erro ao executar consulta:", { text, error })
    throw error
  }
}

export const processAgentData = async (data) => {
  try {
    // Chamar o procedimento armazenado para processar os dados do agente
    await query("CALL process_agent_data($1)", [data])
    logger.info("Dados do agente processados com sucesso")
    return true
  } catch (error) {
    logger.error("Erro ao processar dados do agente:", error)
    throw error
  }
}
