from typing import Any

from sqlalchemy.ext.declarative import as_declarative, declared_attr


class RootBase:
    id: Any
    __name__: str

    # Generate __tablename__ automatically
    @declared_attr
    def __tablename__(cls) -> str:  # pylint: disable=E0213
        return cls.__name__.lower()


@as_declarative()
class Base(RootBase):
    pass


@as_declarative()
class StatsBase(RootBase):
    pass
