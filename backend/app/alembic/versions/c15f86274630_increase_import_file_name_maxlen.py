"""Increase import file name maxlen

Revision ID: c15f86274630
Revises: a2798472ac31
Create Date: 2021-12-29 13:28:12.970189

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "c15f86274630"
down_revision = "a2798472ac31"
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column(
        "import",
        "import_file",
        existing_type=sa.VARCHAR(length=100),
        type_=sa.String(length=512),
        existing_nullable=False,
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column(
        "import",
        "import_file",
        existing_type=sa.String(length=512),
        type_=sa.VARCHAR(length=100),
        existing_nullable=False,
    )
    # ### end Alembic commands ###
