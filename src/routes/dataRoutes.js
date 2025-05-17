import express from "express"
import { getLatestMetrics, getMetricsHistory, getAgents } from "../controllers/dataController.js"

const router = express.Router()

// Rota para obter todos os agentes
router.get("/agents", getAgents)

// Rota para obter as métricas mais recentes de todos os agentes
router.get("/latest", getLatestMetrics)

// Rota para obter as métricas mais recentes de um agente específico
router.get("/latest/:agentId", getLatestMetrics)

// Rota para obter o histórico de métricas de um agente
router.get("/history/:agentId/:metricType", getMetricsHistory)

export const dataRoutes = router
