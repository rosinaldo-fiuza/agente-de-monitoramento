import express from "express"
import { sendUpdateAsnCommand, getCommandHistory } from "../controllers/commandController.js"

const router = express.Router()

// Rota para enviar comando de atualização de ASN
router.post("/update-asn/:agentId", sendUpdateAsnCommand)

// Rota para obter o histórico de comandos de um agente
router.get("/history/:agentId", getCommandHistory)

export const commandRoutes = router
