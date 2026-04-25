import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routes import auth_routes, dashboard_routes, project_routes, routine_routes, workspace_routes

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Automated Routine Creator API",
    description="AI-powered routine planner with authentication and dashboard analytics.",
    version="1.0.0",
)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin] if frontend_origin != "*" else ["*"],
    allow_credentials=True,
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
