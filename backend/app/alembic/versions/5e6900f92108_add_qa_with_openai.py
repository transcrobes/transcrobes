"""Add QA with OpenAI

Revision ID: 5e6900f92108
Revises: bc519998700d
Create Date: 2023-09-29 10:09:53.839631

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "5e6900f92108"
down_revision = "bc519998700d"
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table(
        "openaiapilookup",
        sa.Column("model_name", sa.Text(), nullable=False),
        sa.Column("source_text", sa.String(length=25000), nullable=False),
        sa.Column("prompt_version", sa.Integer(), nullable=False),
        sa.Column("prompt_type", sa.Integer(), nullable=False),
        sa.Column("status", sa.Integer(), nullable=False),
        sa.Column(
            "activate_date",
            sa.DateTime(timezone=True),
            server_default=sa.text("TIMEZONE('utc', CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
        sa.Column("deactivate_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("TIMEZONE('utc', CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("updated_by_id", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("TIMEZONE('utc', CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column("deleted", sa.Boolean(), nullable=False),
        sa.Column("from_lang", sa.String(length=20), nullable=False),
        sa.Column("to_lang", sa.String(length=20), nullable=False),
        sa.Column(
            "cached_date",
            sa.DateTime(timezone=True),
            server_default=sa.text("TIMEZONE('utc', CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("response_json", sa.String(length=25000), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["authuser.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_by_id"],
            ["authuser.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_text", "from_lang", "to_lang"),
    )
    op.create_index(op.f("ix_openaiapilookup_cached_date"), "openaiapilookup", ["cached_date"], unique=False)
    op.create_index(op.f("ix_openaiapilookup_from_lang"), "openaiapilookup", ["from_lang"], unique=False)
    op.create_index(op.f("ix_openaiapilookup_source_text"), "openaiapilookup", ["source_text"], unique=False)
    op.create_index(
        "ix_openaiapilookup_source_text_lower",
        "openaiapilookup",
        [sa.text("lower('source_text')"), "from_lang", "to_lang"],
        unique=False,
    )
    op.create_index(op.f("ix_openaiapilookup_to_lang"), "openaiapilookup", ["to_lang"], unique=False)
    op.create_index(op.f("ix_openaiapilookup_updated_at"), "openaiapilookup", ["updated_at"], unique=False)
    op.create_table(
        "question",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("question", sa.Text(), nullable=True),
        sa.Column("question_type", sa.Integer(), nullable=False),
        sa.Column("extra_data", sa.Text(), nullable=True),
        sa.Column("shared", sa.Boolean(), nullable=False),
        sa.Column("status", sa.Integer(), nullable=False),
        sa.Column(
            "activate_date",
            sa.DateTime(timezone=True),
            server_default=sa.text("TIMEZONE('utc', CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
        sa.Column("deactivate_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("TIMEZONE('utc', CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("updated_by_id", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("TIMEZONE('utc', CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column("deleted", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["authuser.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_by_id"],
            ["authuser.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_question_updated_at"), "question", ["updated_at"], unique=False)
    op.create_table(
        "freequestion",
        sa.Column("question_id", sa.UUID(), nullable=False),
        sa.Column("context", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["question_id"], ["question.id"], initially="DEFERRED", deferrable=True),
        sa.PrimaryKeyConstraint("question_id"),
    )
    op.create_table(
        "questionanswer",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("question_id", sa.UUID(), nullable=False),
        sa.Column("student_answer", sa.Text(), nullable=False),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("status", sa.Integer(), nullable=False),
        sa.Column(
            "activate_date",
            sa.DateTime(timezone=True),
            server_default=sa.text("TIMEZONE('utc', CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
        sa.Column("deactivate_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("TIMEZONE('utc', CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("updated_by_id", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("TIMEZONE('utc', CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column("deleted", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["authuser.id"],
        ),
        sa.ForeignKeyConstraint(["question_id"], ["question.id"], initially="DEFERRED", deferrable=True),
        sa.ForeignKeyConstraint(
            ["updated_by_id"],
            ["authuser.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_questionanswer_question_id"), "questionanswer", ["question_id"], unique=False)
    op.create_index(op.f("ix_questionanswer_updated_at"), "questionanswer", ["updated_at"], unique=False)
    op.create_table(
        "contentquestion",
        sa.Column("question_id", sa.UUID(), nullable=False),
        sa.Column("content_id", sa.UUID(), nullable=False),
        sa.Column("href", sa.Text(), nullable=True),
        sa.Column("model_ids", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["content_id"], ["content.id"], initially="DEFERRED", deferrable=True),
        sa.ForeignKeyConstraint(["question_id"], ["question.id"], initially="DEFERRED", deferrable=True),
        sa.PrimaryKeyConstraint("question_id"),
    )
    op.create_index(op.f("ix_contentquestion_content_id"), "contentquestion", ["content_id"], unique=False)
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f("ix_contentquestion_content_id"), table_name="contentquestion")
    op.drop_table("contentquestion")
    op.drop_index(op.f("ix_questionanswer_updated_at"), table_name="questionanswer")
    op.drop_index(op.f("ix_questionanswer_question_id"), table_name="questionanswer")
    op.drop_table("questionanswer")
    op.drop_table("freequestion")
    op.drop_index(op.f("ix_question_updated_at"), table_name="question")
    op.drop_table("question")
    op.drop_index(op.f("ix_openaiapilookup_updated_at"), table_name="openaiapilookup")
    op.drop_index(op.f("ix_openaiapilookup_to_lang"), table_name="openaiapilookup")
    op.drop_index("ix_openaiapilookup_source_text_lower", table_name="openaiapilookup")
    op.drop_index(op.f("ix_openaiapilookup_source_text"), table_name="openaiapilookup")
    op.drop_index(op.f("ix_openaiapilookup_from_lang"), table_name="openaiapilookup")
    op.drop_index(op.f("ix_openaiapilookup_cached_date"), table_name="openaiapilookup")
    op.drop_table("openaiapilookup")
    # ### end Alembic commands ###
