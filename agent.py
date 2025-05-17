#!/usr/bin/env python3
"""
Agente de Monitoramento para Windows 11
Coleta dados do sistema e envia para RabbitMQ
"""

import os
import time
import json
import socket
import logging
import threading
import psutil
import pika
import requests
from typing import Dict, Any, Optional

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("agent.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("MonitoringAgent")

class MonitoringAgent:
    """Agente de monitoramento que coleta dados do sistema e envia para RabbitMQ"""
    
    def __init__(self, rabbitmq_host: str, rabbitmq_user: str, rabbitmq_password: str,
                 data_queue: str = "system_data", command_queue: str = "agent_commands",
                 collection_interval: int = 10):
        """
        Inicializa o agente de monitoramento
        
        Args:
            rabbitmq_host: Host do servidor RabbitMQ
            rabbitmq_user: Usuário para autenticação no RabbitMQ
            rabbitmq_password: Senha para autenticação no RabbitMQ
            data_queue: Nome da fila para envio de dados
            command_queue: Nome da fila para recebimento de comandos
            collection_interval: Intervalo em segundos para coleta de dados
        """
        self.rabbitmq_host = rabbitmq_host
        self.rabbitmq_user = rabbitmq_user
        self.rabbitmq_password = rabbitmq_password
        self.data_queue = data_queue
        self.command_queue = command_queue
        self.collection_interval = collection_interval
        
        # Armazenamento de dados
        self.public_ip = None
        self.private_ip = None
        self.asn_info = None
        self.force_asn_update = False
        
        # Controle de execução
        self.running = False
        self.command_thread = None
        
        logger.info("Agente de monitoramento inicializado")
    
    def get_cpu_usage(self) -> float:
        """Coleta o uso de CPU em porcentagem"""
        return psutil.cpu_percent(interval=1)
    
    def get_memory_usage(self) -> Dict[str, float]:
        """Coleta informações de uso de memória"""
        memory = psutil.virtual_memory()
        return {
            "total_gb": round(memory.total / (1024**3), 2),
            "used_gb": round(memory.used / (1024**3), 2),
            "percent": memory.percent
        }
    
    def get_private_ip(self) -> str:
        """Obtém o IP privado da máquina"""
        try:
            # Cria uma conexão de socket para determinar qual interface está sendo usada
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            # Não precisa ser um endereço alcançável
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception as e:
            logger.error(f"Erro ao obter IP privado: {e}")
            # Fallback para hostname
            return socket.gethostbyname(socket.gethostname())
    
    def get_public_ip(self) -> Optional[str]:
        """Obtém o IP público da máquina"""
        try:
            response = requests.get("https://api.ipify.org", timeout=5)
            if response.status_code == 200:
                return response.text
            else:
                logger.error(f"Erro ao obter IP público: Status {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Erro ao obter IP público: {e}")
            return None
    
    def get_asn_info(self, ip: str) -> Optional[Dict[str, str]]:
        """
        Obtém informações de ASN/ORG baseado no IP público
        
        Args:
            ip: Endereço IP público
            
        Returns:
            Dicionário com informações de ASN e organização
        """
        try:
            response = requests.get(f"https://ipinfo.io/{ip}/json", timeout=5)
            if response.status_code == 200:
                data = response.json()
                return {
                    "asn": data.get("org", "").split()[0] if "org" in data else "Unknown",
                    "organization": " ".join(data.get("org", "").split()[1:]) if "org" in data else "Unknown",
                    "country": data.get("country", "Unknown"),
                    "region": data.get("region", "Unknown"),
                    "city": data.get("city", "Unknown")
                }
            else:
                logger.error(f"Erro ao obter informações de ASN: Status {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Erro ao obter informações de ASN: {e}")
            return None
    
    def update_network_info(self, force: bool = False) -> None:
        """
        Atualiza informações de rede (IPs e ASN)
        
        Args:
            force: Se True, força a atualização do ASN mesmo se o IP não mudou
        """
        # Atualiza IP privado
        current_private_ip = self.get_private_ip()
        if current_private_ip != self.private_ip:
            logger.info(f"IP privado atualizado: {current_private_ip}")
            self.private_ip = current_private_ip
        
        # Atualiza IP público
        current_public_ip = self.get_public_ip()
        if current_public_ip is None:
            logger.warning("Não foi possível obter o IP público")
            return
        
        ip_changed = current_public_ip != self.public_ip
        if ip_changed:
            logger.info(f"IP público atualizado: {current_public_ip}")
            self.public_ip = current_public_ip
        
        # Atualiza ASN apenas se o IP mudou ou se foi forçado
        if (ip_changed or force or self.force_asn_update) and self.public_ip:
            logger.info("Atualizando informações de ASN...")
            self.asn_info = self.get_asn_info(self.public_ip)
            if self.asn_info:
                logger.info(f"ASN atualizado: {self.asn_info['asn']} - {self.asn_info['organization']}")
            self.force_asn_update = False
    
    def connect_rabbitmq(self) -> Optional[pika.BlockingConnection]:
        """Estabelece conexão com o RabbitMQ"""
        try:
            credentials = pika.PlainCredentials(self.rabbitmq_user, self.rabbitmq_password)
            parameters = pika.ConnectionParameters(
                host=self.rabbitmq_host,
                credentials=credentials,
                heartbeat=600,
                blocked_connection_timeout=300
            )
            return pika.BlockingConnection(parameters)
        except Exception as e:
            logger.error(f"Erro ao conectar ao RabbitMQ: {e}")
            return None
    
    def send_data_to_rabbitmq(self, data: Dict[str, Any]) -> bool:
        """
        Envia dados para o RabbitMQ
        
        Args:
            data: Dicionário com os dados a serem enviados
            
        Returns:
            True se o envio foi bem-sucedido, False caso contrário
        """
        try:
            connection = self.connect_rabbitmq()
            if not connection:
                return False
            
            channel = connection.channel()
            channel.queue_declare(queue=self.data_queue, durable=True)
            
            message = json.dumps(data)
            channel.basic_publish(
                exchange='',
                routing_key=self.data_queue,
                body=message,
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Mensagem persistente
                    content_type='application/json'
                )
            )
            
            connection.close()
            return True
        except Exception as e:
            logger.error(f"Erro ao enviar dados para o RabbitMQ: {e}")
            return False
    
    def process_command(self, ch, method, properties, body) -> None:
        """
        Processa comandos recebidos do RabbitMQ
        
        Args:
            ch: Canal RabbitMQ
            method: Método de entrega
            properties: Propriedades da mensagem
            body: Corpo da mensagem
        """
        try:
            command = json.loads(body)
            logger.info(f"Comando recebido: {command}")
            
            if command.get('action') == 'update_asn':
                logger.info("Comando para atualizar ASN recebido")
                self.force_asn_update = True
            
            # Confirma o recebimento da mensagem
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Erro ao processar comando: {e}")
            # Rejeita a mensagem em caso de erro
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    
    def listen_for_commands(self) -> None:
        """Escuta por comandos na fila do RabbitMQ"""
        while self.running:
            try:
                connection = self.connect_rabbitmq()
                if not connection:
                    logger.warning("Não foi possível conectar ao RabbitMQ para escutar comandos. Tentando novamente em 30 segundos.")
                    time.sleep(30)
                    continue
                
                channel = connection.channel()
                channel.queue_declare(queue=self.command_queue, durable=True)
                channel.basic_qos(prefetch_count=1)
                channel.basic_consume(queue=self.command_queue, on_message_callback=self.process_command)
                
                logger.info(f"Escutando comandos na fila {self.command_queue}")
                channel.start_consuming()
            except Exception as e:
                logger.error(f"Erro na thread de comandos: {e}")
                time.sleep(10)  # Espera antes de tentar novamente
    
    def collect_and_send_data(self) -> None:
        """Coleta e envia dados do sistema para o RabbitMQ"""
        # Atualiza informações de rede
        self.update_network_info()
        
        # Coleta dados do sistema
        cpu_usage = self.get_cpu_usage()
        memory_usage = self.get_memory_usage()
        
        # Prepara o payload
        data = {
            "timestamp": time.time(),
            "hostname": socket.gethostname(),
            "cpu_usage": cpu_usage,
            "memory_usage": memory_usage,
            "network": {
                "public_ip": self.public_ip,
                "private_ip": self.private_ip,
                "asn_info": self.asn_info
            }
        }
        
        # Envia dados para o RabbitMQ
        success = self.send_data_to_rabbitmq(data)
        if success:
            logger.info(f"Dados enviados com sucesso: CPU {cpu_usage}%, Memória {memory_usage['percent']}%")
        else:
            logger.warning("Falha ao enviar dados")
    
    def start(self) -> None:
        """Inicia o agente de monitoramento"""
        if self.running:
            logger.warning("O agente já está em execução")
            return
        
        self.running = True
        
        # Inicia thread para escutar comandos
        self.command_thread = threading.Thread(target=self.listen_for_commands)
        self.command_thread.daemon = True
        self.command_thread.start()
        
        logger.info("Agente de monitoramento iniciado")
        
        try:
            while self.running:
                self.collect_and_send_data()
                time.sleep(self.collection_interval)
        except KeyboardInterrupt:
            logger.info("Interrupção de teclado detectada")
            self.stop()
        except Exception as e:
            logger.error(f"Erro no loop principal: {e}")
            self.stop()
    
    def stop(self) -> None:
        """Para o agente de monitoramento"""
        logger.info("Parando o agente de monitoramento...")
        self.running = False
        
        # Aguarda a thread de comandos terminar
        if self.command_thread and self.command_thread.is_alive():
            self.command_thread.join(timeout=5)
        
        logger.info("Agente de monitoramento parado")


if __name__ == "__main__":
    # Configurações do RabbitMQ
    RABBITMQ_HOST = "172.17.253.10"
    RABBITMQ_USER = "admin"
    RABBITMQ_PASSWORD = "a1b23fec99VMB"
    
    # Cria e inicia o agente
    agent = MonitoringAgent(
        rabbitmq_host=RABBITMQ_HOST,
        rabbitmq_user=RABBITMQ_USER,
        rabbitmq_password=RABBITMQ_PASSWORD,
        collection_interval=10  # Coleta dados a cada 10 segundos
    )
    
    agent.start()
