"""
H2Sentry Database Engine and Session Management
Supports Production PostgreSQL (via DATABASE_URL) with SQLite local dev fallback.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

raw_db_url = os.getenv("DATABASE_URL")

if raw_db_url:
    # Normalize postgres:// to postgresql:// for Render, Supabase, and Heroku compatibility
    if raw_db_url.startswith("postgres://"):
        db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
    else:
        db_url = raw_db_url

    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )
    DATABASE_URL = db_url
else:
    # Local Development SQLite Fallback
    DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
    os.makedirs(DB_DIR, exist_ok=True)
    DB_PATH = os.path.join(DB_DIR, "h2sentry.db")
    DATABASE_URL = f"sqlite:///{DB_PATH}"

    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

