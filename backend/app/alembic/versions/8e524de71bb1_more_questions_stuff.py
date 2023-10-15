"""More questions stuff

Revision ID: 8e524de71bb1
Revises: 5e6900f92108
Create Date: 2023-10-05 02:47:49.201798

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "8e524de71bb1"
down_revision = "5e6900f92108"
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column("question", sa.Column("title", sa.String(length=255), nullable=False))
    op.add_column("question", sa.Column("description", sa.Text(), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column("question", "description")
    op.drop_column("question", "title")
    # ### end Alembic commands ###