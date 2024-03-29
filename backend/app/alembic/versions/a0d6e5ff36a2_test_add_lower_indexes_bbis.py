"""test add lower indexes bbis

Revision ID: a0d6e5ff36a2
Revises: 770d8836cf2f
Create Date: 2022-10-25 10:20:11.388363

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "a0d6e5ff36a2"
down_revision = "770d8836cf2f"
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f("ix_bingapilookup_from_lang"), table_name="bingapilookup")
    op.create_index(op.f("ix_bingapilookup_from_lang"), "bingapilookup", ["from_lang"], unique=False)
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f("ix_bingapilookup_from_lang"), table_name="bingapilookup")
    # ### end Alembic commands ###
