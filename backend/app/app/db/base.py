# Import all the models, so that Base has them before being
# imported by Alembic
# flake8: noqa
# pylint: disable=W0611
from app.db.base_class import Base
from app.models.user import AuthUser
