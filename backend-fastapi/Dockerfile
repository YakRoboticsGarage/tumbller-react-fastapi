# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install uv, the package manager used by the project
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy the dependency files
COPY pyproject.toml uv.lock ./

# Create virtual environment and install dependencies
RUN uv sync --frozen --no-dev

# Copy the rest of the application's code
COPY . .

# Create data and logs directories
RUN mkdir -p /app/data /app/logs

# The app runs on port 8000, so expose it
EXPOSE 8000

# Run migrations and start the server
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]
