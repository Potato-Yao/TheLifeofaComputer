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
    
    # Generate new event
    event = dispatcher.get_event(req.event_type, current_state)
    
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
    
    # Mark event as seen if it's unique
    if req.event.is_unique and req.event.event_id not in req.state.hidden_flags.history_tags:
        req.state.hidden_flags.history_tags.append(req.event.event_id)
        
    # Append tags
    for tag in req.event.tags:
        req.state.hidden_flags.history_tags.append(tag)
        
    # Keep history_tags reasonably small, let's keep last 50
    if len(req.state.hidden_flags.history_tags) > 50:
        req.state.hidden_flags.history_tags = req.state.hidden_flags.history_tags[-50:]
    
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

