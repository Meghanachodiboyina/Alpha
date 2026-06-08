import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine
from .routes import auth_routes, dashboard_routes, project_routes, routine_routes, workspace_routes

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Automated Routine Creator API",
    description="AI-powered routine planner with authentication and dashboard analytics.",
    version="1.0.0",
)

frontend_origin = settings.FRONTEND_ORIGIN

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from .rate_limiter import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin] if frontend_origin != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response

app.include_router(auth_routes.router)
app.include_router(routine_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(project_routes.router)
app.include_router(workspace_routes.router)


@app.get("/")
def health_check():
    return {"message": "Automated Routine Creator API is running."}
