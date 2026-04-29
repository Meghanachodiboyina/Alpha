import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

from .database import Base, engine
from .routes import auth_routes, dashboard_routes, project_routes, routine_routes, workspace_routes

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Automated Routine Creator API",
    description="AI-powered routine planner with authentication and dashboard analytics.",
    version="1.0.0",
)

frontend_origin_setting = os.getenv("FRONTEND_ORIGIN") or os.getenv("FRONTEND_URL") or "*"
allowed_origins = [
    origin.strip().rstrip("/")
    for origin in frontend_origin_setting.split(",")
    if origin.strip()
]
allow_all_origins = "*" in allowed_origins or not allowed_origins
if not allow_all_origins:
    for dev_origin in ("http://127.0.0.1:5500", "http://localhost:5500"):
        if dev_origin not in allowed_origins:
            allowed_origins.append(dev_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else allowed_origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(routine_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(project_routes.router)
app.include_router(workspace_routes.router)


@app.get("/")
def health_check():
    return {"message": "Automated Routine Creator API is running."}
