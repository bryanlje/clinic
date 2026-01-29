"""convert_patient_pk_to_uuid

Revision ID: 94b5b23ca2c8
Revises: e543a24fcca9
Create Date: 2026-01-30 00:06:20.861436

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid


# revision identifiers, used by Alembic.
revision: str = '94b5b23ca2c8'
down_revision: Union[str, Sequence[str], None] = 'e543a24fcca9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    connection = op.get_bind()

    # --- 1. PREPARE PATIENTS TABLE ---
    # Add temporary UUID column to patients
    op.add_column('patients', sa.Column('new_uuid', postgresql.UUID(as_uuid=True), nullable=True))

    # Generate UUIDs for all existing patients using Python
    # (We fetch all rows, generate a UUID, and update them one by one)
    # Note: For massive datasets (100k+), use pgcrypto extension inside SQL instead.
    patients = connection.execute(sa.text("SELECT id FROM patients")).fetchall()
    
    for patient in patients:
        old_id = patient[0] # The string "A1147"
        new_uid = uuid.uuid4()
        connection.execute(
            sa.text("UPDATE patients SET new_uuid = :uid WHERE id = :oid"),
            {"uid": new_uid, "oid": old_id}
        )

    # Now make the UUID column non-nullable
    op.alter_column('patients', 'new_uuid', nullable=False)

    # --- 2. PREPARE VISITS TABLE ---
    # Add temporary UUID column to visits
    op.add_column('visits', sa.Column('patient_uuid', postgresql.UUID(as_uuid=True), nullable=True))

    # Map the foreign keys: Set visits.patient_uuid matching the patient's new UUID
    connection.execute(sa.text("""
        UPDATE visits 
        SET patient_uuid = patients.new_uuid 
        FROM patients 
        WHERE visits.patient_id = patients.id
    """))

    # Make it non-nullable
    op.alter_column('visits', 'patient_uuid', nullable=False)

    # --- 3. SWAP COLUMNS AND CONSTRAINTS ---
    
    # A. Drop old constraints
    # You might need to check your exact constraint names in Postgres (e.g., via pgAdmin)
    # usually: table_column_fkey
    op.drop_constraint('visits_patient_id_fkey', 'visits', type_='foreignkey')
    op.drop_constraint('patients_pkey', 'patients', type_='primary')

    # B. Rename Columns
    # Rename Patient columns
    op.alter_column('patients', 'id', new_column_name='display_id')
    op.alter_column('patients', 'new_uuid', new_column_name='id')
    
    # Rename Visit columns
    # We first drop the old string column, then rename the new UUID column
    op.drop_column('visits', 'patient_id')
    op.alter_column('visits', 'patient_uuid', new_column_name='patient_id')

    # C. Create new constraints
    # Primary Key on UUID
    op.create_primary_key('patients_pkey', 'patients', ['id'])
    
    # Foreign Key on Visits linking to UUID
    op.create_foreign_key(
        'visits_patient_id_fkey', 'visits', 'patients', 
        ['patient_id'], ['id'], ondelete='CASCADE'
    )
    
    # Unique Constraint on the old ID (now display_id)
    op.create_unique_constraint('uq_patients_display_id', 'patients', ['display_id'])

def downgrade():
    # Writing a downgrade for PK swaps is complex and usually not worth it 
    # unless you are in strict production. 
    pass