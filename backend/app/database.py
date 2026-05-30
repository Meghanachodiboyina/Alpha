import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

def _normalize_database_url(database_url: str | None) -> str:
    if not database_url:
        return ""
    normalized_url = database_url.strip()
    if normalized_url.startswith("postgres://"):
        return normalized_url.replace("postgres://", "postgresql+psycopg2://", 1)
    if normalized_url.startswith("postgresql://"):
        return normalized_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return normalized_url

SQLITE_FALLBACK_URL = settings.SQLITE_FALLBACK_URL
DATABASE_URL = _normalize_database_url(settings.DATABASE_URL) or SQLITE_FALLBACK_URL


def _create_engine(database_url: str):
    engine_kwargs = {"pool_pre_ping": True}
    if database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    if database_url.startswith("postgresql"):
        engine_kwargs["pool_recycle"] = 300
    return create_engine(database_url, **engine_kwargs)


def _create_resilient_engine():
    try:
        primary_engine = _create_engine(DATABASE_URL)
    except ModuleNotFoundError:
        return _create_engine(SQLITE_FALLBACK_URL)
    try:
        with primary_engine.connect():
            return primary_engine
    except SQLAlchemyError:
        fallback_engine = _create_engine(SQLITE_FALLBACK_URL)
        return fallback_engine


engine = _create_resilient_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
