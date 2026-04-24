import os
import json
import random
import glob
from typing import List, Dict, Any, Optional
from models.event import EventSchema
from models.player import PlayerState

class EventDispatcher:
    def __init__(self, data_dir: str = None):
        self.data_dir = data_dir or os.getenv("EVENTS_DIR", "./data/events")
        self.event_pool: List[EventSchema] = []
        self.fallback_events: List[EventSchema] = [
            EventSchema(
                event_id="evt_fallback_01",
                event_type="routine",
                tags=["safe"],
                is_unique=False,
                weight=1,
                prerequisites={},
                title="平静的一天",
                description="今天风和日丽，你的电脑安静地运行着，什么事情也没有发生。",
                technical_context="",
                options=[
                    {
                        "option_id": "opt_safe_1",
                        "text": "继续生活",
                        "required_cyber_sense": 0,
                        "outcomes": [
                            {
                                "probability": 1.0,
                                "result_text": "安然无恙度过。",
                                "stat_changes": {}
                            }
                        ]
                    }
                ]
            )
        ]
        self.reload_events()

    def reload_events(self):
        """Hot-reload: Load all JSON events from data/events/*/*.json"""
        self.event_pool.clear()
        search_pattern = os.path.join(self.data_dir, "**", "*.json")
        for filepath in glob.glob(search_pattern, recursive=True):
            if "drafts" in filepath: continue  # Skip drafts
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # If it's a list of events
                    if isinstance(data, list):
                        for item in data:
                            self.event_pool.append(EventSchema(**item))
                    # If it's a single event
                    elif isinstance(data, dict):
                        self.event_pool.append(EventSchema(**data))
            except Exception as e:
                print(f"[Dispatcher] Error loading {filepath}: {e}")

    def evaluate_condition(self, condition_str: str, actual_value: Any) -> bool:
        """Evaluate a prerequisite condition like '<= 80' against an actual value"""
        if isinstance(condition_str, (int, float)):
            return actual_value == condition_str
            
        condition_str = str(condition_str).strip()
        if condition_str.startswith("<="):
            return actual_value <= float(condition_str[2:])
        elif condition_str.startswith(">="):
            return actual_value >= float(condition_str[2:])
        elif condition_str.startswith("<"):
            return actual_value < float(condition_str[1:])
        elif condition_str.startswith(">"):
            return actual_value > float(condition_str[1:])
        elif condition_str.startswith("=="):
            return actual_value == float(condition_str[2:])
        elif condition_str.startswith("!="):
            return actual_value != float(condition_str[2:])
        else:
            try:
                return actual_value == float(condition_str)
            except ValueError:
                return str(actual_value) == condition_str

    def check_prerequisites(self, event: EventSchema, player: PlayerState) -> bool:
        """Hard Filter: check if player meets prerequisites"""
        p = event.prerequisites
        if not p:
            return True
            
        if "min_day" in p and player.day < p["min_day"]:
            return False
        if "max_day" in p and player.day > p["max_day"]:
            return False
            
        if "min_wealth" in p and player.attributes.wealth < p["min_wealth"]:
            return False
        if "min_mental" in p and player.attributes.mental_state < p["min_mental"]:
            return False
        if "min_cyber_sense" in p and player.attributes.cyber_sense < p["min_cyber_sense"]:
            return False
            
        if "required_health_hardware" in p:
            if not self.evaluate_condition(p["required_health_hardware"], player.health_status.hardware):
                return False
        if "required_health_system" in p:
            if not self.evaluate_condition(p["required_health_system"], player.health_status.system):
                return False
                
        if "required_item" in p:
            has_item = any(item.get("name") == p["required_item"] for item in player.inventory) if isinstance(player.inventory, list) and len(player.inventory) > 0 and isinstance(player.inventory[0], dict) else p["required_item"] in player.inventory
            if not has_item:
                return False
                
        if "exclude_flags" in p:
            for flag in p["exclude_flags"]:
                # Check machine flags
                if flag in player.hidden_flags.machine_flags:
                    return False
                # Check inventory strings
                if isinstance(player.inventory, list) and len(player.inventory) > 0:
                    if isinstance(player.inventory[0], str) and flag in player.inventory:
                        return False
                    elif isinstance(player.inventory[0], dict):
                        if any(item.get("name") == flag for item in player.inventory):
                            return False
                    
        return True

    def get_event(self, event_type: str, player: PlayerState) -> EventSchema:
        """Fetch an event for the player based on state and weight"""
        # Step 1 & 2: Pooling and Hard Filter
        candidates = []
        for event in self.event_pool:
            if event.event_type != event_type:
                continue
            if event.is_unique and event.event_id in player.hidden_flags.history_tags:
                continue
            if self.check_prerequisites(event, player):
                candidates.append(event)
                
        # Step 3: Dynamic Weighting
        weights = []
        for event in candidates:
            w = event.weight
            # Penalty for recently seen tags
            for tag in event.tags:
                if tag in player.hidden_flags.history_tags:
                    w = int(w * 0.2)
            weights.append(max(1, w)) # minimum weight 1
            
        # Step 4: Weighted Random Draw
        if not candidates:
            return random.choice([e for e in self.fallback_events if e.event_type == event_type] or self.fallback_events)
            
        return random.choices(candidates, weights=weights, k=1)[0]

# Singleton instance
dispatcher = EventDispatcher()
