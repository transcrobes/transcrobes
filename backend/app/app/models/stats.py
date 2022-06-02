from app.db.base_class import StatsBase
from sqlalchemy import Column, Float, Integer, String


class UserDay(StatsBase):
    user_id = Column(Integer, primary_key=True)
    day = Column(Integer, primary_key=True)
    nb_seen = Column(Integer, default=0)
    nb_checked = Column(Integer, default=0)
    nb_success = Column(Integer, default=0)
    nb_failures = Column(Integer, default=0)
    updated_at = Column(Float, default=0, index=True)


class UserWord(StatsBase):
    user_id = Column(Integer, primary_key=True)
    graph = Column(String(1000), primary_key=True)
    nb_seen = Column(Integer, default=0)
    last_seen = Column(Float, default=0)
    nb_checked = Column(Integer, default=0)
    last_checked = Column(Float, default=0)
    nb_seen_since_last_check = Column(Integer, default=0)
    updated_at = Column(Float, default=0, index=True)
