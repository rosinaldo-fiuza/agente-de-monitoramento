#!/bin/bash

# Script para visualizar logs do Dashboard de Monitoramento

# Definir diretório de logs
LOGS_DIR="/opt/monitoring-dashboard/logs"

# Função para exibir menu
show_menu() {
    clear
    echo "=== Visualizador de Logs do Dashboard de Monitoramento ==="
    echo "1. Logs do Backend"
    echo "2. Logs de Erro do Backend"
    echo "3. Logs do Nginx (Acesso)"
    echo "4. Logs do Nginx (Erro)"
    echo "5. Logs do PostgreSQL"
    echo "6. Logs do RabbitMQ"
    echo "0. Sair"
    echo "=================================================="
    echo -n "Escolha uma opção: "
}

# Loop principal
while true; do
    show_menu
    read -r opt

    case $opt in
        1)
            echo "Logs do Backend:"
            tail -f "$LOGS_DIR/backend.log"
            ;;
        2)
            echo "Logs de Erro do Backend:"
            tail -f "$LOGS_DIR/backend-error.log"
            ;;
        3)
            echo "Logs do Nginx (Acesso):"
            tail -f /var/log/nginx/access.log
            ;;
        4)
            echo "Logs do Nginx (Erro):"
            tail -f /var/log/nginx/error.log
            ;;
        5)
            echo "Logs do PostgreSQL:"
            tail -f /var/log/postgresql/postgresql-*.log
            ;;
        6)
            echo "Logs do RabbitMQ:"
            tail -f /var/log/rabbitmq/rabbit@*.log
            ;;
        0)
            echo "Saindo..."
            exit 0
            ;;
        *)
            echo "Opção inválida. Pressione ENTER para continuar..."
            read -r
            ;;
    esac
done
