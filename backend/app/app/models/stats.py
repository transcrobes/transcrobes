from app.data.models import ActivityTypes
from app.db.base_class import StatsBase
from sqlalchemy import BigInteger, Column, Float, Identity, Integer, SmallInteger, String


class UserActivity(StatsBase):
    aid = Column(Integer, Identity(), primary_key=True)
    user_id = Column(Integer, nullable=False)
    activity_type = Column(SmallInteger, default=ActivityTypes.DASHBOARD, nullable=False)
    activity_start = Column(BigInteger, nullable=False)
    activity_end = Column(BigInteger, nullable=False)
    data = Column(String(2000), nullable=True)


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
