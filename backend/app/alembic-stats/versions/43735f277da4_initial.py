"""Initial

Revision ID: 43735f277da4
Revises:
Create Date: 2022-06-12 08:06:16.492071

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "43735f277da4"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table(
        "userday",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("day", sa.Integer(), nullable=False),
        sa.Column("nb_seen", sa.Integer(), nullable=True),
        sa.Column("nb_checked", sa.Integer(), nullable=True),
        sa.Column("nb_success", sa.Integer(), nullable=True),
        sa.Column("nb_failures", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("user_id", "day"),
    )
    op.create_index(op.f("ix_userday_updated_at"), "userday", ["updated_at"], unique=False)
    op.create_table(
        "userword",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("graph", sa.String(length=1000), nullable=False),
        sa.Column("nb_seen", sa.Integer(), nullable=True),
        sa.Column("last_seen", sa.Float(), nullable=True),
        sa.Column("nb_checked", sa.Integer(), nullable=True),
        sa.Column("last_checked", sa.Float(), nullable=True),
        sa.Column("nb_seen_since_last_check", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("user_id", "graph"),
    )
    op.create_index(op.f("ix_userword_updated_at"), "userword", ["updated_at"], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f("ix_userword_updated_at"), table_name="userword")
    op.drop_table("userword")
    op.drop_index(op.f("ix_userday_updated_at"), table_name="userday")
    op.drop_table("userday")
    # ### end Alembic commands ###