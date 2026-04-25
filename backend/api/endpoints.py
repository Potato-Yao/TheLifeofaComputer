from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
import random

from models.player import PlayerState
from models.event import EventSchema
from services.dispatcher import dispatcher
from services.logic_engine import apply_outcome, end_of_day_calculation

router = APIRouter()

class NextDayRequest(BaseModel):
    state: PlayerState
    event_type: str = "routine"

class ResolveActionRequest(BaseModel):
    state: PlayerState
    event: EventSchema
    option_id: str

@router.post("/event/next")
async def next_day(req: NextDayRequest):
    current_state = req.state
    # Handle end of day of previous day
    if current_state.day > 1:
        current_state = end_of_day_calculation(current_state)
    
    target_type = req.event_type
    
    # Only auto-determine type if requesting a standard 'routine' flow
    if target_type == "routine":
        # Load configurations from environment (Docker compatible)
        random_chance = float(os.getenv("RANDOM_EVENT_CHANCE", "0.10"))
        crisis_base = float(os.getenv("CRISIS_CHANCE_BASE", "0.05"))
        health_threshold = int(os.getenv("CRISIS_HEALTH_THRESHOLD", "60"))
        
        # 1. Check for Random events (fixed chance)
        if random.random() < random_chance:
            target_type = "random"
        else:
            # 2. Check for Crisis (health-based)
            h = current_state.health_status
            min_health = min(h.hardware, h.system, h.software)
            crisis_chance = crisis_base + max(0, (health_threshold - min_health) / 100.0)
            
            if random.random() < crisis_chance:
                target_type = "crisis"

    # Generate new event
    event = dispatcher.get_event(target_type, current_state)
    
    # Fallback chain: random -> crisis -> routine
    if not event:
        if target_type == "random":
            # Try crisis if random failed
            event = dispatcher.get_event("crisis", current_state)
            if not event:
                event = dispatcher.get_event("routine", current_state)
        elif target_type == "crisis":
            event = dispatcher.get_event("routine", current_state)
    
    return {
        "event": event,
        "state": current_state
    }

@router.post("/action/resolve")
async def resolve_action(req: ResolveActionRequest):
    # Find outcome based on option id and probabilities
    selected_opt = None
    for opt in req.event.options:
        if opt.option_id == req.option_id:
            selected_opt = opt
            break
    
    if not selected_opt:
        raise HTTPException(status_code=400, detail="Option not found")
        
    r = random.random()
    cumulative = 0.0
    chosen_outcome = selected_opt.outcomes[-1] # fallback to last
    for outcome in selected_opt.outcomes:
        cumulative += outcome.probability
        if r <= cumulative:
            chosen_outcome = outcome
            break
            
    apply_outcome(req.state, chosen_outcome.stat_changes)
    
    # Mark event as seen if it's unique (Permanent record)
    if req.event.is_unique and req.event.event_id not in req.state.hidden_flags.seen_event_ids:
        req.state.hidden_flags.seen_event_ids.append(req.event.event_id)
        
    # Append tags (Temporary record for balancing)
    for tag in req.event.tags:
        req.state.hidden_flags.history_tags.append(tag)
        
    # Keep history_tags window smaller for better variety (last 30 tags)
    if len(req.state.hidden_flags.history_tags) > 30:
        req.state.hidden_flags.history_tags = req.state.hidden_flags.history_tags[-30:]
    
    response_data = {
        "state": req.state,
        "result_text": chosen_outcome.result_text
    }
    
    if chosen_outcome.next_event_id:
        next_event = dispatcher.get_event_by_id(chosen_outcome.next_event_id)
        if next_event:
            response_data["next_event"] = next_event

    return response_data

@router.post("/admin/reload_events")
async def reload_events():
    dispatcher.reload_events()
    return {"message": f"Successfully loaded {len(dispatcher.event_pool)} events."}

