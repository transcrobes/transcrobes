"""make usersurvey commoninfo

Revision ID: 563a8fb92548
Revises: ade3b08c9f1f
Create Date: 2021-08-02 08:12:08.674393

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "563a8fb92548"
down_revision = "ade3b08c9f1f"
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column("usersurvey", sa.Column("status", sa.Integer(), nullable=False))
    op.add_column(
        "usersurvey",
        sa.Column(
            "activate_date",
            sa.DateTime(timezone=True),
            server_default=sa.text("TIMEZONE('utc', CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
    )
    op.add_column(
        "usersurvey",
        sa.Column("deactivate_date", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("usersurvey", sa.Column("title", sa.String(length=255), nullable=False))
    op.add_column("usersurvey", sa.Column("description", sa.Text(), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column("usersurvey", "description")
    op.drop_column("usersurvey", "title")
    op.drop_column("usersurvey", "deactivate_date")
    op.drop_column("usersurvey", "activate_date")
    op.drop_column("usersurvey", "status")
    # ### end Alembic commands ###
