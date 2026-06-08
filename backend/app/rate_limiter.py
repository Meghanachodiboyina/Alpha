from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

def get_user_id_or_ip(request: Request) -> str:
    if hasattr(request.state, "user") and request.state.user:
        return f"user:{request.state.user.id}"
    return get_remote_address(request)

limiter = Limiter(key_func=get_user_id_or_ip)
