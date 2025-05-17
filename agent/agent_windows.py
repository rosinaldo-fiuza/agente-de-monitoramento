#!/usr/bin/env python3
"""
Agente de Monitoramento para Windows 11
Coleta dados do sistema e envia para RabbitMQ
Inclui ícone na system tray para indicar status de conectividade
"""

import os
import sys
import time
import json
import socket
import logging
import threading
import yaml
import psutil
import pika
import requests
import io
from typing import Dict, Any, Optional
from PIL import Image, ImageDraw
import pystray
import tempfile
import webbrowser
from datetime import datetime

# Configuração de logging básica até carregar a configuração completa
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("MonitoringAgent")

class MonitoringAgent:
    """Agente de monitoramento que coleta dados do sistema e envia para RabbitMQ"""
    
    def __init__(self, config_path: str = "config.yaml"):
        """
        Inicializa o agente de monitoramento
        
        Args:
            config_path: Caminho para o arquivo de configuração YAML
        """
        # Carregar configuração
        self.config = self._load_config(config_path)
        
        # Configurar logging
        self._setup_logging()
        
        # Configurações do RabbitMQ
        rabbitmq_config = self.config.get("rabbitmq", {})
        self.rabbitmq_host = self._get_env_or_config("RABBITMQ_HOST", rabbitmq_config.get("host", "localhost"))
        self.rabbitmq_port = int(self._get_env_or_config("RABBITMQ_PORT", rabbitmq_config.get("port", 5672)))
        self.rabbitmq_user = self._get_env_or_config("RABBITMQ_USER", rabbitmq_config.get("user", "guest"))
        self.rabbitmq_password = self._get_env_or_config("RABBITMQ_PASSWORD", rabbitmq_config.get("password", "guest"))
        self.rabbitmq_vhost = self._get_env_or_config("RABBITMQ_VHOST", rabbitmq_config.get("vhost", "/"))
        self.data_queue = self._get_env_or_config("RABBITMQ_QUEUE_DATA", rabbitmq_config.get("data_queue", "agent_data"))
        self.command_queue = self._get_env_or_config("RABBITMQ_QUEUE_COMMANDS", rabbitmq_config.get("command_queue", "agent_commands"))
        
        # Configurações do Dashboard
        dashboard_config = self.config.get("dashboard", {})
        self.dashboard_url = dashboard_config.get("url", "http://localhost:80")
        
        # Intervalo de coleta
        general_config = self.config.get("general", {})
        self.collection_interval = int(self._get_env_or_config("COLLECTION_INTERVAL", general_config.get("collection_interval", 10)))
        
        # Hostname
        self.hostname_override = general_config.get("hostname_override")
        self.hostname = self.hostname_override if self.hostname_override else socket.gethostname()
        
        # Armazenamento de dados
        self.public_ip = None
        self.private_ip = None
        self.asn_info = None
        self.force_asn_update = False
        
        # Controle de execução
        self.running = False
        self.command_thread = None
        self.tray_thread = None
        self.icon = None
        self.connection_status = "disconnected"  # disconnected, connecting, connected, error
        self.last_data_sent = None
        self.last_error = None
        
        logger.info(f"Agente de monitoramento inicializado para {self.hostname}")
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """
        Carrega a configuração do arquivo YAML
        
        Args:
            config_path: Caminho para o arquivo de configuração
            
        Returns:
            Dicionário com a configuração
        """
        try:
            with open(config_path, 'r') as file:
                config = yaml.safe_load(file)
            return config
        except Exception as e:
            logger.error(f"Erro ao carregar configuração: {e}")
            logger.warning("Usando configuração padrão")
            return {}
    
    def _get_env_or_config(self, env_var: str, config_value: Any) -> Any:
        """
        Obtém um valor de variável de ambiente ou da configuração
        
        Args:
            env_var: Nome da variável de ambiente
            config_value: Valor da configuração
            
        Returns:
            Valor da variável de ambiente ou da configuração
        """
        return os.environ.get(env_var, config_value)
    
    def _setup_logging(self):
        """Configura o logging com base nas configurações"""
        log_config = self.config.get("logging", {})
        log_level_name = self.config.get("general", {}).get("log_level", "INFO")
        log_level = getattr(logging, log_level_name)
        
        # Remover handlers existentes
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)
        
        # Configurar logger
        logger.setLevel(log_level)
        
        # Adicionar handler de console
        if log_config.get("console", {}).get("enabled", True):
            console_handler = logging.StreamHandler()
            console_handler.setLevel(log_level)
            console_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            console_handler.setFormatter(console_formatter)
            logger.addHandler(console_handler)
        
        # Adicionar handler de arquivo
        file_config = log_config.get("file", {})
        if file_config.get("enabled", True):
            try:
                from logging.handlers import RotatingFileHandler
                
                log_path = file_config.get("path", "logs/agent.log")
                # Garantir que o diretório de logs existe
                os.makedirs(os.path.dirname(log_path), exist_ok=True)
                
                file_handler = RotatingFileHandler(
                    log_path,
                    maxBytes=file_config.get("max_size_mb", 10) * 1024 * 1024,
                    backupCount=file_config.get("backup_count", 5)
                )
                file_handler.setLevel(log_level)
                file_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
                file_handler.setFormatter(file_formatter)
                logger.addHandler(file_handler)
            except Exception as e:
                logger.error(f"Erro ao configurar log em arquivo: {e}")
    
    def get_cpu_usage(self) -> Dict[str, Any]:
        """Coleta informações de uso de CPU"""
        cpu_config = self.config.get("metrics", {}).get("cpu", {})
        
        result = {
            "percent": psutil.cpu_percent(interval=1)
        }
        
        # Coletar informações por CPU
        if cpu_config.get("collect_per_cpu", True):
            result["per_cpu_percent"] = psutil.cpu_percent(interval=0, percpu=True)
        
        # Coletar tempos de CPU
        if cpu_config.get("collect_cpu_times", True):
            cpu_times = psutil.cpu_times()
            result["times"] = {
                "user": cpu_times.user,
                "system": cpu_times.system,
                "idle": cpu_times.idle
            }
        
        # Coletar média de carga (apenas em sistemas Unix)
        if cpu_config.get("collect_load_avg", True) and hasattr(psutil, "getloadavg"):
            try:
                load_avg = psutil.getloadavg()
                result["load_avg"] = {
                    "1min": load_avg[0],
                    "5min": load_avg[1],
                    "15min": load_avg[2]
                }
            except Exception as e:
                logger.warning(f"Erro ao coletar média de carga: {e}")
        
        return result
    
    def get_memory_usage(self) -> Dict[str, Any]:
        """Coleta informações de uso de memória"""
        memory_config = self.config.get("metrics", {}).get("memory", {})
        
        # Memória virtual
        memory = psutil.virtual_memory()
        result = {
            "total_gb": round(memory.total / (1024**3), 2),
            "used_gb": round(memory.used / (1024**3), 2),
            "free_gb": round(memory.available / (1024**3), 2),
            "percent": memory.percent
        }
        
        # Memória swap
        if memory_config.get("collect_swap", True):
            swap = psutil.swap_memory()
            result["swap"] = {
                "total_gb": round(swap.total / (1024**3), 2),
                "used_gb": round(swap.used / (1024**3), 2),
                "free_gb": round(swap.total / (1024**3) - swap.used / (1024**3), 2),
                "percent": swap.percent
            }
        
        return result
    
    def get_disk_usage(self) -> Dict[str, Any]:
        """Coleta informações de uso de disco"""
        disk_config = self.config.get("metrics", {}).get("disk", {})
        
        if not disk_config.get("enabled", True):
            return {}
        
        result = {"partitions": []}
        
        # Ignorar certos pontos de montagem
        ignore_mounts = disk_config.get("ignore_mounts", [])
        
        # Coletar informações de partições específicas ou todas
        paths = disk_config.get("paths", ["/"])
        
        for partition in psutil.disk_partitions(all=False):
            # Ignorar pontos de montagem específicos
            if any(partition.mountpoint.startswith(mount) for mount in ignore_mounts):
                continue
            
            # Se caminhos específicos foram definidos, verificar se este é um deles
            if paths and not any(partition.mountpoint.startswith(path) for path in paths):
                continue
            
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                partition_info = {
                    "device": partition.device,
                    "mountpoint": partition.mountpoint,
                    "fstype": partition.fstype,
                    "total_gb": round(usage.total / (1024**3), 2),
                    "used_gb": round(usage.used / (1024**3), 2),
                    "free_gb": round(usage.free / (1024**3), 2),
                    "percent": usage.percent
                }
                result["partitions"].append(partition_info)
            except (PermissionError, FileNotFoundError) as e:
                logger.debug(f"Erro ao acessar {partition.mountpoint}: {e}")
        
        # Coletar contadores de I/O
        if disk_config.get("collect_io_counters", True):
            try:
                io_counters = psutil.disk_io_counters(perdisk=True)
                result["io_counters"] = {}
                
                for disk, counters in io_counters.items():
                    result["io_counters"][disk] = {
                        "read_count": counters.read_count,
                        "write_count": counters.write_count,
                        "read_bytes": counters.read_bytes,
                        "write_bytes": counters.write_bytes,
                        "read_time": counters.read_time,
                        "write_time": counters.write_time
                    }
            except Exception as e:
                logger.warning(f"Erro ao coletar contadores de I/O: {e}")
        
        return result
    
    def get_network_usage(self) -> Dict[str, Any]:
        """Coleta informações de uso de rede"""
        network_config = self.config.get("metrics", {}).get("network", {})
        
        if not network_config.get("enabled", True):
            return {}
        
        result = {}
        
        # Ignorar certas interfaces
        ignore_interfaces = network_config.get("ignore_interfaces", [])
        
        # Coletar contadores de I/O
        if network_config.get("collect_io_counters", True):
            try:
                io_counters = psutil.net_io_counters(pernic=True)
                result["io_counters"] = {}
                
                for interface, counters in io_counters.items():
                    # Ignorar interfaces específicas
                    if any(interface.startswith(prefix) for prefix in ignore_interfaces):
                        continue
                    
                    result["io_counters"][interface] = {
                        "bytes_sent": counters.bytes_sent,
                        "bytes_recv": counters.bytes_recv,
                        "packets_sent": counters.packets_sent,
                        "packets_recv": counters.packets_recv,
                        "errin": counters.errin,
                        "errout": counters.errout,
                        "dropin": counters.dropin,
                        "dropout": counters.dropout
                    }
            except Exception as e:
                logger.warning(f"Erro ao coletar contadores de I/O de rede: {e}")
        
        # Coletar informações de interfaces
        if network_config.get("collect_interfaces", True):
            try:
                interfaces = psutil.net_if_addrs()
                result["interfaces"] = {}
                
                for interface, addrs in interfaces.items():
                    # Ignorar interfaces específicas
                    if any(interface.startswith(prefix) for prefix in ignore_interfaces):
                        continue
                    
                    result["interfaces"][interface] = []
                    
                    for addr in addrs:
                        addr_info = {
                            "family": str(addr.family),
                            "address": addr.address
                        }
                        
                        if addr.netmask:
                            addr_info["netmask"] = addr.netmask
                        
                        if addr.broadcast:
                            addr_info["broadcast"] = addr.broadcast
                        
                        result["interfaces"][interface].append(addr_info)
            except Exception as e:
                logger.warning(f"Erro ao coletar informações de interfaces: {e}")
        
        # Coletar conexões
        if network_config.get("collect_connections", True):
            try:
                connections = psutil.net_connections(kind='inet')
                result["connections"] = {
                    "established": 0,
                    "listen": 0,
                    "time_wait": 0,
                    "close_wait": 0,
                    "total": len(connections)
                }
                
                for conn in connections:
                    if conn.status == 'ESTABLISHED':
                        result["connections"]["established"] += 1
                    elif conn.status == 'LISTEN':
                        result["connections"]["listen"] += 1
                    elif conn.status == 'TIME_WAIT':
                        result["connections"]["time_wait"] += 1
                    elif conn.status == 'CLOSE_WAIT':
                        result["connections"]["close_wait"] += 1
            except Exception as e:
                logger.warning(f"Erro ao coletar conexões de rede: {e}")
        
        return result
    
    def get_temperature(self) -> Dict[str, Any]:
        """Coleta informações de temperatura (se disponível)"""
        temp_config = self.config.get("metrics", {}).get("temperature", {})
        
        if not temp_config.get("enabled", True):
            return {}
        
        result = {}
        
        # Coletar sensores de temperatura
        if temp_config.get("collect_sensors", True):
            try:
                if hasattr(psutil, "sensors_temperatures"):
                    temps = psutil.sensors_temperatures()
                    if temps:
                        result["sensors"] = {}
                        
                        for name, entries in temps.items():
                            result["sensors"][name] = []
                            
                            for entry in entries:
                                sensor = {
                                    "label": entry.label or name,
                                    "current": entry.current
                                }
                                
                                if entry.high:
                                    sensor["high"] = entry.high
                                
                                if entry.critical:
                                    sensor["critical"] = entry.critical
                                
                                result["sensors"][name].append(sensor)
            except Exception as e:
                logger.warning(f"Erro ao coletar temperaturas: {e}")
        
        return result
    
    def get_processes(self) -> Dict[str, Any]:
        """Coleta informações de processos"""
        proc_config = self.config.get("metrics", {}).get("processes", {})
        
        if not proc_config.get("enabled", True):
            return {}
        
        result = {
            "total": 0,
            "running": 0,
            "sleeping": 0,
            "stopped": 0,
            "zombie": 0
        }
        
        # Coletar processos com maior uso de CPU/memória
        if proc_config.get("collect_top_processes", 0) > 0:
            try:
                processes = []
                top_count = proc_config.get("collect_top_processes", 10)
                
                for proc in psutil.process_iter(['pid', 'name', 'username', 'status', 'cpu_percent', 'memory_percent']):
                    try:
                        pinfo = proc.info
                        
                        # Contar por status
                        if pinfo['status'] == psutil.STATUS_RUNNING:
                            result["running"] += 1
                        elif pinfo['status'] == psutil.STATUS_SLEEPING:
                            result["sleeping"] += 1
                        elif pinfo['status'] == psutil.STATUS_STOPPED:
                            result["stopped"] += 1
                        elif pinfo['status'] == psutil.STATUS_ZOMBIE:
                            result["zombie"] += 1
                        
                        # Atualizar contagem total
                        result["total"] += 1
                        
                        # Coletar informações para top processos
                        proc.cpu_percent()  # Primeira chamada sempre retorna 0
                        processes.append(pinfo)
                    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                        pass
                
                # Aguardar um pouco para obter uso de CPU
                time.sleep(0.1)
                
                # Atualizar uso de CPU e ordenar
                for proc in processes:
                    try:
                        p = psutil.Process(proc['pid'])
                        proc['cpu_percent'] = p.cpu_percent()
                        proc['memory_percent'] = p.memory_percent()
                    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                        proc['cpu_percent'] = 0
                        proc['memory_percent'] = 0
                
                # Top processos por CPU
                top_cpu = sorted(processes, key=lambda p: p['cpu_percent'], reverse=True)[:top_count]
                result["top_cpu"] = [{
                    "pid": p['pid'],
                    "name": p['name'],
                    "username": p['username'],
                    "cpu_percent": p['cpu_percent'],
                    "memory_percent": p['memory_percent']
                } for p in top_cpu]
                
                # Top processos por memória
                top_memory = sorted(processes, key=lambda p: p['memory_percent'], reverse=True)[:top_count]
                result["top_memory"] = [{
                    "pid": p['pid'],
                    "name": p['name'],
                    "username": p['username'],
                    "cpu_percent": p['cpu_percent'],
                    "memory_percent": p['memory_percent']
                } for p in top_memory]
            except Exception as e:
                logger.warning(f"Erro ao coletar top processos: {e}")
        
        # Verificar processos específicos
        watch_processes = proc_config.get("watch_processes", [])
        if watch_processes:
            result["watched"] = {}
            
            for watch in watch_processes:
                process_name = watch.get("name")
                if not process_name:
                    continue
                
                try:
                    found = False
                    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                        try:
                            # Verificar se o nome do processo corresponde
                            if process_name.lower() in proc.info['name'].lower():
                                found = True
                                result["watched"][process_name] = {
                                    "running": True,
                                    "pid": proc.info['pid']
                                }
                                
                                # Coletar uso de CPU e memória
                                try:
                                    result["watched"][process_name]["cpu_percent"] = proc.cpu_percent(interval=0.1)
                                    result["watched"][process_name]["memory_percent"] = proc.memory_percent()
                                except (psutil.NoSuchProcess, psutil.AccessDenied):
                                    pass
                                
                                break
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            pass
                    
                    if not found:
                        result["watched"][process_name] = {
                            "running": False
                        }
                except Exception as e:
                    logger.warning(f"Erro ao verificar processo {process_name}: {e}")
        
        return result
    
    def check_noip_duc(self) -> Dict[str, Any]:
        """Verifica o status do NoIP DUC"""
        noip_config = self.config.get("noip_duc", {})
        
        if not noip_config.get("enabled", True):
            return {}
        
        result = {
            "installed": False,
            "running": False,
            "service_active": False,
            "version": None,
            "install_path": None,
            "last_update": None
        }
        
        # Verificar se o NoIP DUC está instalado
        if noip_config.get("check_installed", True):
            possible_paths = noip_config.get("possible_paths", [])
            
            for path in possible_paths:
                if os.path.exists(path):
                    result["installed"] = True
                    result["install_path"] = path
                    break
        
        # Verificar se o NoIP DUC está em execução
        if noip_config.get("check_running", True):
            try:
                for proc in psutil.process_iter(['pid', 'name']):
                    try:
                        if "noip" in proc.info['name'].lower() or "duc" in proc.info['name'].lower():
                            result["running"] = True
                            break
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
            except Exception as e:
                logger.warning(f"Erro ao verificar processo NoIP DUC: {e}")
        
        # Verificar se o serviço do NoIP DUC está ativo
        if noip_config.get("check_service", True):
            # No Windows
            if os.name == 'nt':
                try:
                    import subprocess
                    output = subprocess.check_output(["sc", "query", "NoIPDUC"], text=True)
                    if "RUNNING" in output:
                        result["service_active"] = True
                except Exception as e:
                    logger.debug(f"Erro ao verificar serviço NoIP DUC no Windows: {e}")
            # No Linux
            else:
                try:
                    import subprocess
                    output = subprocess.check_output(["systemctl", "is-active", "noip"], text=True)
                    if "active" in output:
                        result["service_active"] = True
                except Exception as e:
                    logger.debug(f"Erro ao verificar serviço NoIP DUC no Linux: {e}")
        
        return result
    
    def check_ports(self) -> Dict[str, Any]:
        """Verifica o status de portas TCP/UDP"""
        port_config = self.config.get("port_check", {})
        
        if not port_config.get("enabled", True):
            return {}
        
        result = {"targets": []}
        
        for target in port_config.get("targets", []):
            host = target.get("host")
            port = target.get("port")
            protocol = target.get("protocol", "tcp").lower()
            name = target.get("name", f"{host}:{port}")
            
            if not host or not port:
                continue
            
            target_result = {
                "name": name,
                "host": host,
                "port": port,
                "protocol": protocol,
                "status": "unknown",
                "response_time": None
            }
            
            try:
                start_time = time.time()
                
                if protocol == "tcp":
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(port_config.get("timeout", 5))
                    result_code = s.connect_ex((host, port))
                    s.close()
                    
                    if result_code == 0:
                        target_result["status"] = "open"
                    else:
                        target_result["status"] = "closed"
                
                elif protocol == "udp":
                    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    s.settimeout(port_config.get("timeout", 5))
                    s.sendto(b"", (host, port))
                    
                    try:
                        s.recvfrom(1024)
                        target_result["status"] = "open"
                    except socket.timeout:
                        # Para UDP, não podemos ter certeza se a porta está fechada ou se o servidor não respondeu
                        target_result["status"] = "no_response"
                    
                    s.close()
                
                end_time = time.time()
                target_result["response_time"] = round((end_time - start_time) * 1000, 2)  # em ms
            
            except socket.gaierror:
                target_result["status"] = "dns_error"
            except Exception as e:
                target_result["status"] = "error"
                target_result["error"] = str(e)
            
            result["targets"].append(target_result)
        
        return result
    
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
        network_info_config = self.config.get("network_info", {})
        service_url = network_info_config.get("public_ip_service", "https://api.ipify.org")
        
        try:
            response = requests.get(service_url, timeout=5)
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
        network_info_config = self.config.get("network_info", {})
        service_url_template = network_info_config.get("asn_info_service", "https://ipinfo.io/{ip}/json")
        service_url = service_url_template.replace("{ip}", ip)
        
        try:
            response = requests.get(service_url, timeout=5)
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
        network_info_config = self.config.get("network_info", {})
        
        # Atualizar IP privado
        if network_info_config.get("collect_private_ip", True):
            current_private_ip = self.get_private_ip()
            if current_private_ip != self.private_ip:
                logger.info(f"IP privado atualizado: {current_private_ip}")
                self.private_ip = current_private_ip
        
        # Atualizar IP público
        if network_info_config.get("collect_public_ip", True):
            current_public_ip = self.get_public_ip()
            if current_public_ip is None:
                logger.warning("Não foi possível obter o IP público")
                return
            
            ip_changed = current_public_ip != self.public_ip
            if ip_changed:
                logger.info(f"IP público atualizado: {current_public_ip}")
                self.public_ip = current_public_ip
            
            # Atualizar ASN apenas se o IP mudou ou se foi forçado
            if network_info_config.get("collect_asn_info", True):
                if (ip_changed or force or self.force_asn_update) and self.public_ip:
                    logger.info("Atualizando informações de ASN...")
                    self.asn_info = self.get_asn_info(self.public_ip)
                    if self.asn_info:
                        logger.info(f"ASN atualizado: {self.asn_info['asn']} - {self.asn_info['organization']}")
                    self.force_asn_update = False
    
    def connect_rabbitmq(self) -> Optional[pika.BlockingConnection]:
        """Estabelece conexão com o RabbitMQ"""
        try:
            self.update_connection_status("connecting")
            
            credentials = pika.PlainCredentials(self.rabbitmq_user, self.rabbitmq_password)
            parameters = pika.ConnectionParameters(
                host=self.rabbitmq_host,
                port=self.rabbitmq_port,
                virtual_host=self.rabbitmq_vhost,
                credentials=credentials,
                heartbeat=self.config.get("rabbitmq", {}).get("heartbeat", 600),
                blocked_connection_timeout=self.config.get("rabbitmq", {}).get("connection_timeout", 300)
            )
            connection = pika.BlockingConnection(parameters)
            
            self.update_connection_status("connected")
            return connection
        except Exception as e:
            logger.error(f"Erro ao conectar ao RabbitMQ: {e}")
            self.update_connection_status("error", str(e))
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
            self.last_data_sent = datetime.now()
            return True
        except Exception as e:
            logger.error(f"Erro ao enviar dados para o RabbitMQ: {e}")
            self.update_connection_status("error", str(e))
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
                self.update_connection_status("error", str(e))
                time.sleep(10)  # Espera antes de tentar novamente
    
    def collect_and_send_data(self) -> None:
        """Coleta e envia dados do sistema para o RabbitMQ"""
        # Atualiza informações de rede
        self.update_network_info()
        
        # Coleta dados do sistema
        metrics = {}
        
        # CPU
        if self.config.get("metrics", {}).get("cpu", {}).get("enabled", True):
            metrics["cpu"] = self.get_cpu_usage()
        
        # Memória
        if self.config.get("metrics", {}).get("memory", {}).get("enabled", True):
            metrics["memory"] = self.get_memory_usage()
        
        # Disco
        if self.config.get("metrics", {}).get("disk", {}).get("enabled", True):
            metrics["disk"] = self.get_disk_usage()
        
        # Rede
        if self.config.get("metrics", {}).get("network", {}).get("enabled", True):
            metrics["network"] = self.get_network_usage()
        
        # Temperatura
        if self.config.get("metrics", {}).get("temperature", {}).get("enabled", True):
            metrics["temperature"] = self.get_temperature()
        
        # Processos
        if self.config.get("metrics", {}).get("processes", {}).get("enabled", True):
            metrics["processes"] = self.get_processes()
        
        # NoIP DUC
        if self.config.get("noip_duc", {}).get("enabled", True):
            metrics["noip_duc"] = self.check_noip_duc()
        
        # Verificação de portas
        if self.config.get("port_check", {}).get("enabled", True):
            metrics["port_check"] = self.check_ports()
        
        # Prepara o payload
        data = {
            "timestamp": time.time(),
            "hostname": self.hostname,
            "metrics": metrics,
            "network_info": {
                "public_ip": self.public_ip,
                "private_ip": self.private_ip,
                "asn_info": self.asn_info
            }
        }
        
        # Envia dados para o RabbitMQ
        success = self.send_data_to_rabbitmq(data)
        if success:
            logger.info(f"Dados enviados com sucesso: CPU {metrics.get('cpu', {}).get('percent', 0)}%, Memória {metrics.get('memory', {}).get('percent', 0)}%")
        else:
            logger.warning("Falha ao enviar dados")
    
    def create_tray_icon(self):
        """Cria o ícone na system tray"""
        # Criar ícones para diferentes estados
        icon_size = (64, 64)
        
        # Ícone desconectado (cinza)
        disconnected_icon = self.create_icon_image(icon_size, (128, 128, 128))
        
        # Ícone conectando (amarelo)
        connecting_icon = self.create_icon_image(icon_size, (255, 165, 0))
        
        # Ícone conectado (verde)
        connected_icon = self.create_icon_image(icon_size, (0, 128, 0))
        
        # Ícone de erro (vermelho)
        error_icon = self.create_icon_image(icon_size, (255, 0, 0))
        
        # Dicionário de ícones
        self.icons = {
            "disconnected": disconnected_icon,
            "connecting": connecting_icon,
            "connected": connected_icon,
            "error": error_icon
        }
        
        # Criar menu
        menu = (
            pystray.MenuItem('Status', self.show_status, default=True),
            pystray.MenuItem('Abrir Dashboard', self.open_dashboard),
            pystray.MenuItem('Forçar Atualização ASN', self.force_update_asn),
            pystray.MenuItem('Reiniciar Agente', self.restart_agent),
            pystray.MenuItem('Sair', self.exit_agent)
        )
        
        # Criar ícone
        self.icon = pystray.Icon(
            "monitoring_agent",
            self.icons["disconnected"],
            "Agente de Monitoramento (Desconectado)",
            menu
        )
        
        # Iniciar ícone
        self.icon.run()
    
    def create_icon_image(self, size, color):
        """
        Cria uma imagem para o ícone
        
        Args:
            size: Tamanho da imagem (largura, altura)
            color: Cor do ícone (r, g, b)
            
        Returns:
            Imagem para o ícone
        """
        image = Image.new('RGB', size, (255, 255, 255))
        dc = ImageDraw.Draw(image)
        
        # Desenhar um círculo preenchido
        dc.ellipse([(8, 8), (size[0] - 8, size[1] - 8)], fill=color)
        
        return image
    
    def update_connection_status(self, status, error_message=None):
        """
        Atualiza o status de conexão e o ícone na system tray
        
        Args:
            status: Status de conexão (disconnected, connecting, connected, error)
            error_message: Mensagem de erro (opcional)
        """
        self.connection_status = status
        self.last_error = error_message
        
        if self.icon:
            # Atualizar ícone
            self.icon.icon = self.icons[status]
            
            # Atualizar tooltip
            if status == "disconnected":
                self.icon.title = "Agente de Monitoramento (Desconectado)"
            elif status == "connecting":
                self.icon.title = "Agente de Monitoramento (Conectando...)"
            elif status == "connected":
                self.icon.title = f"Agente de Monitoramento (Conectado - {self.hostname})"
            elif status == "error":
                self.icon.title = f"Agente de Monitoramento (Erro: {error_message})"
    
    def show_status(self):
        """Exibe o status atual do agente"""
        status_text = f"Hostname: {self.hostname}\n"
        status_text += f"Status: {self.connection_status}\n"
        
        if self.last_data_sent:
            status_text += f"Último envio: {self.last_data_sent.strftime('%d/%m/%Y %H:%M:%S')}\n"
        
        if self.private_ip:
            status_text += f"IP Privado: {self.private_ip}\n"
        
        if self.public_ip:
            status_text += f"IP Público: {self.public_ip}\n"
        
        if self.asn_info:
            status_text += f"ASN: {self.asn_info.get('asn', 'Desconhecido')}\n"
            status_text += f"Organização: {self.asn_info.get('organization', 'Desconhecida')}\n"
        
        if self.last_error:
            status_text += f"Último erro: {self.last_error}\n"
        
        # Exibir métricas básicas
        try:
            cpu_percent = psutil.cpu_percent(interval=0.5)
            memory = psutil.virtual_memory()
            
            status_text += f"\nCPU: {cpu_percent}%\n"
            status_text += f"Memória: {memory.percent}%\n"
        except Exception:
            pass
        
        # Criar arquivo temporário para exibir o status
        with tempfile.NamedTemporaryFile('w', delete=False, suffix='.txt') as f:
            f.write(status_text)
            status_file = f.name
        
        # Abrir o arquivo com o aplicativo padrão
        try:
            os.startfile(status_file)
        except Exception:
            # Fallback para outros sistemas operacionais
            try:
                import subprocess
                subprocess.call(['notepad', status_file])
            except Exception as e:
                logger.error(f"Erro ao abrir arquivo de status: {e}")
    
    def open_dashboard(self):
        """Abre o dashboard no navegador padrão"""
        try:
            webbrowser.open(self.dashboard_url)
        except Exception as e:
            logger.error(f"Erro ao abrir dashboard: {e}")
    
    def force_update_asn(self):
        """Força a atualização do ASN"""
        self.force_asn_update = True
        logger.info("Atualização de ASN forçada pelo usuário")
    
    def restart_agent(self):
        """Reinicia o agente"""
        logger.info("Reiniciando agente...")
        self.stop()
        
        # Reiniciar o processo
        python = sys.executable
        os.execl(python, python, *sys.argv)
    
    def exit_agent(self):
        """Encerra o agente"""
        logger.info("Encerrando agente...")
        self.stop()
        
        # Encerrar o ícone da system tray
        if self.icon:
            self.icon.stop()
        
        # Encerrar o processo
        sys.exit(0)
    
    def start_tray_icon(self):
        """Inicia o ícone na system tray em uma thread separada"""
        self.tray_thread = threading.Thread(target=self.create_tray_icon)
        self.tray_thread.daemon = True
        self.tray_thread.start()
    
    def start(self) -> None:
        """Inicia o agente de monitoramento"""
        if self.running:
            logger.warning("O agente já está em execução")
            return
        
        self.running = True
        
        # Iniciar ícone na system tray
        self.start_tray_icon()
        
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
            self.update_connection_status("error", str(e))
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
    # Criar e iniciar o agente
    agent = MonitoringAgent()
    agent.start()
