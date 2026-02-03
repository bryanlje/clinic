#!/bin/sh

# Stop on error
set -e

# Run migrations
echo "Applying database migrations..."
alembic upgrade head

# Start the application (exec passes control to Gunicorn so it handles signals correctly)
exec "$@"