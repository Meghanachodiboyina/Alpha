import os

from dotenv import load_dotenv
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:password@localhost:3306/automated_routine_creator",
)

SQLITE_FALLBACK_URL = os.getenv(
    "SQLITE_FALLBACK_URL",
    f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(__file__)), 'arc_local.db')}",
)


def _create_engine(database_url: str):
    engine_kwargs = {"pool_pre_ping": True}
    if database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    return create_engine(database_url, **engine_kwargs)


def _create_resilient_engine():
    primary_engine = _create_engine(DATABASE_URL)
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
