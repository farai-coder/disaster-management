import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# In production DATABASE_URL points at a file on a mounted volume so data
# survives container redeploys; locally it falls back to a file in the cwd.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./disaster_management.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
