"""split languages column

Revision ID: c34179311737
Revises: 94b5b23ca2c8
Create Date: 2026-01-30 14:45:15.966991

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c34179311737'
down_revision: Union[str, Sequence[str], None] = '94b5b23ca2c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add columns as nullable initially
    op.add_column('patients', sa.Column('languages_parents', sa.ARRAY(sa.String()), nullable=True))
    op.add_column('patients', sa.Column('languages_children', sa.ARRAY(sa.String()), nullable=True))

    # 2. Fill existing rows with an empty array so they aren't NULL
    # Using raw SQL to update existing rows
    op.execute("UPDATE patients SET languages_parents = '{}' WHERE languages_parents IS NULL")
    op.execute("UPDATE patients SET languages_children = '{}' WHERE languages_children IS NULL")

    # 3. Now that there are no NULLs, enforce the NOT NULL constraint
    op.alter_column('patients', 'languages_parents', nullable=False)
    op.alter_column('patients', 'languages_children', nullable=False)

    # 4. Drop the old column
    op.drop_column('patients', 'languages')


def downgrade() -> None:
    op.add_column('patients', sa.Column('languages', sa.ARRAY(sa.String()), nullable=True))
    op.drop_column('patients', 'languages_children')
    op.drop_column('patients', 'languages_parents')
