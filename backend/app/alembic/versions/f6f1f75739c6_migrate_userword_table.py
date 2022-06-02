"""Migrate UserWord table

Revision ID: f6f1f75739c6
Revises: 88e3934f8af5
Create Date: 2022-06-12 07:08:16.644535

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "f6f1f75739c6"
down_revision = "88e3934f8af5"
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index("ix_userword_updated_at", table_name="userword")
    op.drop_index("ix_userword_user_id", table_name="userword")
    op.drop_index("ix_userword_word_id", table_name="userword")
    op.drop_table("userword")
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table(
        "userword",
        sa.Column("id", sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column("nb_seen", sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column("last_seen", postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
        sa.Column("nb_checked", sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column("last_checked", postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
        sa.Column("user_id", sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column("word_id", sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column("nb_seen_since_last_check", sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column("is_known", sa.BOOLEAN(), autoincrement=False, nullable=False),
        sa.Column("last_translated", postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
        sa.Column("nb_translated", sa.INTEGER(), autoincrement=False, nullable=True),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("timezone('utc'::text, CURRENT_TIMESTAMP)"),
            autoincrement=False,
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["authuser.id"], name="userword_user_id_fkey", initially="DEFERRED", deferrable=True
        ),
        sa.ForeignKeyConstraint(
            ["word_id"], ["bingapilookup.id"], name="userword_word_id_fkey", initially="DEFERRED", deferrable=True
        ),
        sa.PrimaryKeyConstraint("id", name="userword_pkey"),
        sa.UniqueConstraint("user_id", "word_id", name="userword_user_id_word_id_key"),
    )
    op.create_index("ix_userword_word_id", "userword", ["word_id"], unique=False)
    op.create_index("ix_userword_user_id", "userword", ["user_id"], unique=False)
    op.create_index("ix_userword_updated_at", "userword", ["updated_at"], unique=False)
    # ### end Alembic commands ###
