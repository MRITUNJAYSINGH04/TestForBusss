from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.core.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    Base.metadata.create_all(bind=engine)
    # Check for missing columns in existing SQLite tables and add them gracefully
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if "company_nodes" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("company_nodes")]
            new_columns = [
                ("phone", "VARCHAR(64)"),
                ("contact_email", "VARCHAR(128)"),
                ("google_maps_url", "TEXT"),
                ("social_profiles", "JSON"),
                ("key_people", "JSON"),
                ("rating", "FLOAT"),
                ("reviews_count", "FLOAT"),
                ("operating_hours", "VARCHAR(128)"),
                ("business_type", "VARCHAR(128)"),
                ("lead_match_score", "FLOAT DEFAULT 85.0"),
                ("outreach_status", "VARCHAR(32) DEFAULT 'NEW'"),
                ("recent_news", "JSON"),
                ("osint_data", "JSON"),
                ("osm_id", "VARCHAR(64)"),
                ("osm_type", "VARCHAR(32)"),
                ("category", "VARCHAR(128)"),
                ("source", "VARCHAR(64) DEFAULT 'OpenStreetMap'"),
                ("source_url", "TEXT"),
            ]
            with engine.connect() as conn:
                for col_name, col_type in new_columns:
                    if col_name not in columns:
                        conn.execute(text(f"ALTER TABLE company_nodes ADD COLUMN {col_name} {col_type}"))
                conn.commit()

        if "user_profiles" in inspector.get_table_names():
            up_columns = [c["name"] for c in inspector.get_columns("user_profiles")]
            if "tools_utilized" not in up_columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE user_profiles ADD COLUMN tools_utilized JSON"))
                    conn.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Database column migration note: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
