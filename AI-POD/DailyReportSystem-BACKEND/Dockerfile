FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Create non-root user
RUN addgroup --system django && adduser --system --ingroup django django

WORKDIR /usr/src/app

# System deps
RUN apt-get update && \
    apt-get install -y gcc libpq-dev curl dos2unix && \
    rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Convert entrypoint line endings and make it executable
RUN dos2unix ./entrypoint.sh && \
    chmod +x ./entrypoint.sh

# Create writable directories for Django
RUN mkdir -p /usr/src/app/core/staticfiles \
    && mkdir -p /usr/src/app/core/media \
    && chown -R django:django /usr/src/app

# Switch to non-root user
USER django

ENTRYPOINT ["./entrypoint.sh"]

# Default = ASGI (Uvicorn worker)
CMD ["gunicorn", "--chdir", "/usr/src/app", "core.asgi:application", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--workers", "4", "--reload"]
