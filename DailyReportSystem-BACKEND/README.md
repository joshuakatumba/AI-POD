# Daily Report System

A production-ready Django setup using **Docker**, **Docker Compose**, and **Makefile** with support for:

## Structure of system

* Frontend: Javascript/Typescript (React)
* Backend: Python (Django)

* Dev vs Prod environments
* PostgreSQL
* Gunicorn (WSGI) + optional Uvicorn (ASGI)
* Healthchecks
* Non-root container user
* Static files handling
* Simple developer workflow via `make`

---

## Project Structure

```
DailyReportSystem/
├── core/
│   ├── __init__.py
│   └── wsgi.py
│   └── asgi.py
├── manage.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── Makefile
├── .env
└── README.md
```

---

## Requirements

* Docker
* Docker Compose (v2+ recommended)
* Make (macOS/Linux; Windows via WSL)

Verify:

```bash
docker --version
docker compose version
make --version
```

---

## Quick Start (Development)

### Environment variables

Create a `.env` file:

```env
DEBUG=1
SECRET_KEY=dev-secret-key

POSTGRES_DB=app_db
POSTGRES_USER=app_user
POSTGRES_PASSWORD=app_password
POSTGRES_HOST=db
POSTGRES_PORT=5432
```

---

### Build & start containers

```bash
make up
```

---

### Run database migrations

```bash
make migrate
```

---

### Collect static files

```bash
make collectstatic
```

---

### Create a superuser

```bash
make superuser
```

---

### Access the app

* App: [http://localhost:8000/](http://localhost:8000/)
* Admin: [http://localhost:8000/admin/](http://localhost:8000/admin/)

---

### Run Django tests (pytest)

```bash
make test
```

---

### Run Django tests (verbose)

```bash
make test-verbose
```

---

### Run Django tests with coverage

```bash
make test-coverage
```

---
## Common Make Commands

```bash
make help              # List all commands
make up                # Start dev stack
make down              # Stop dev stack
make restart           # Restart dev stack
make logs              # Tail app logs

make test              # Run tests using pytest
make test-verbose      # Run tests using pytest (verbose)
make test-coverage     # Run tests with coverage

make migrate           # Run migrations
make makemigrations    # Create migrations
make collectstatic     # Collect static files
make shell             # Django shell
make bash              # App container shell

make prod-up           # Start production stack
make prod-down         # Stop production stack
```

---

## Running Django Commands Manually

All Django commands run through Docker:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml \
  run --rm app python manage.py <command>
```

Using `make` is strongly recommended.

---

## Dev vs Prod Compose

### Development

* Auto-reload enabled
* Source code mounted as volume
* Debug enabled

```bash
make up
```

### Production

* No source mounting
* Debug disabled
* Explicit startup commands

```bash
make prod-up
```

---

## Startup Tasks

On container startup (prod):

* `python manage.py migrate`
* `python manage.py collectstatic --noinput`

This ensures the app is always ready.

---

## ASGI / Uvicorn Support

The project supports ASGI via `core/asgi.py`.

To run with Uvicorn (example):

```bash
uvicorn core.asgi:application --host 0.0.0.0 --port 8000
```

You can swap Gunicorn for:

```bash
gunicorn core.asgi:application \
  -k uvicorn.workers.UvicornWorker
```

---

## 🩺 Healthchecks

### App

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/"]
  interval: 30s
  timeout: 5s
  retries: 5
```

### Database

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U $POSTGRES_USER"]
```

---

## Security Features

* Runs as **non-root user** inside container
* No secrets baked into images
* Production image without dev tools

---

## Common Issues

### Static files not loading

Ensure:

```python
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
```

Then run:

```bash
make collectstatic
```

---

### Database auth errors

Check `.env` values match Postgres container variables exactly.

---

### "Request Header Fields Too Large"

Usually caused by proxy or misconfigured server headers. If using Nginx, increase:

```
large_client_header_buffers 4 16k;
```

---

## Production Checklist

* [ ] DEBUG=0
* [ ] Secure SECRET_KEY
* [ ] HTTPS termination
* [ ] Proper ALLOWED_HOSTS
* [ ] Persistent volumes
* [ ] Log aggregation

---

## Contributing

* Keep changes minimal and documented
* Prefer Makefile commands
* Run migrations intentionally

---

## License

MIT (or your preferred license)



# AI-POD-
