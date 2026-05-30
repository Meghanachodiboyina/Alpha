import sys
from app.database import engine, Base
from app import models

try:
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Database schema successfully recreated with UUIDs.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
