from datetime import date, datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from .models import User, UserAIUsage
from .config_plans import PLAN_LIMITS

def check_and_increment_ai_quota(db: Session, user: User, action_type: str):
    """
    Checks if the user has reached their daily AI usage limit.
    If not, increments the counter.
    action_type should be one of:
    - 'routine_generations'
    - 'audio_transcriptions'
    - 'clarification_requests'
    - 'analysis_requests'
    """
    today = date.today()
    
    # Load today's UserAIUsage record
    usage = db.query(UserAIUsage).filter(
        UserAIUsage.user_id == user.id,
        UserAIUsage.date == today
    ).first()
    
    if not usage:
        usage = UserAIUsage(user_id=user.id, date=today)
        db.add(usage)
        db.commit()
        db.refresh(usage)
        
    # Read user's subscription plan
    plan = user.subscription_plan if user.subscription_plan else "free"
    
    # Get limit for action type (fallback to free plan limits if plan not found)
    plan_config = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    limit = plan_config.get(action_type, 0)
    
    # Check limit
    current_count = getattr(usage, action_type, 0)
    if current_count >= limit:
        raise HTTPException(
            status_code=403,
            detail={"error": "daily_limit_reached", "message": "You have reached today's AI usage limit."}
        )
        
    # Increment counter
    setattr(usage, action_type, current_count + 1)
    usage.last_request_at = datetime.now(timezone.utc)
    
    db.commit()
