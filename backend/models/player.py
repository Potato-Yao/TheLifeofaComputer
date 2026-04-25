from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any

class HardwareDetails(BaseModel):
    cpu: int = 100
    disk: int = 100
    ram: int = 100
    screen: int = 100
    fan: int = 100
    shell: int = 100

class HealthStatus(BaseModel):
    hardware: int = 100  # average/overall
    hardware_details: HardwareDetails = HardwareDetails()
    system: int = 100
    storage: int = 100
    software: int = 100

class PlayerAttributes(BaseModel):
    wealth: int = 1000
    cyber_sense: int = 0
    mental_state: int = 100

class HiddenFlags(BaseModel):
    net_assoc_trust: int = 0
    scam_counter: int = 0
    machine_flags: List[str] = []
    seen_event_ids: List[str] = []
    history_tags: List[str] = []
    joined_npa: bool = False
    pending_repairs: List[Any] = []
    read_articles: List[str] = []
    is_endless_mode: bool = False

class PlayerState(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    uuid: str = "default-uuid"
    day: int = 1
    health_status: HealthStatus = HealthStatus()
    attributes: PlayerAttributes = PlayerAttributes()
    inventory: List[Any] = []
    hidden_flags: HiddenFlags = HiddenFlags()
