from app.core.config import settings
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

async_engine = create_async_engine(
    str(settings.SQLALCHEMY_DATABASE_URI),
    pool_pre_ping=True,
    pool_size=settings.SQLALCHEMY_POOL_SIZE,
    max_overflow=settings.SQLALCHEMY_POOL_MAX_OVERFLOW,
    # echo=True,
)

async_session: sessionmaker = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_SYNC_URI), echo=False, future=True)

async_stats_engine = create_async_engine(
    str(settings.STATS_SQLALCHEMY_DATABASE_URI),
    pool_pre_ping=True,
    pool_size=settings.STATS_SQLALCHEMY_POOL_SIZE,
    max_overflow=settings.STATS_SQLALCHEMY_POOL_MAX_OVERFLOW,
    # echo=True,
)

async_stats_session: sessionmaker = sessionmaker(
    bind=async_stats_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

stats_engine = create_engine(str(settings.STATS_SQLALCHEMY_DATABASE_SYNC_URI), echo=False, future=True)
