# ============================
# Config
# ============================
PROJECT_NAME=django-app

COMPOSE=docker compose
DEV_COMPOSE=-f docker-compose.yml -f docker-compose.dev.yml
PROD_COMPOSE=-f docker-compose.yml -f docker-compose.prod.yml

APP_SERVICE=app

# ============================
# Helpers
# ============================
.PHONY: help
help:
	@echo ""
	@echo "Available commands:"
	@echo ""
	@echo "  make up              Start dev containers"
	@echo "  make down            Stop containers"
	@echo "  make build           Build images"
	@echo "  make logs            Tail app logs"
	@echo ""
	@echo "  make test            Run tests using pytest"
	@echo "  make test-verbose    Run tests using pytest (verbose)"
	@echo "  make test-coverage   Run tests with coverage"
	@echo ""
	@echo "  make migrate         Run Django migrations"
	@echo "  make makemigrations  Create migrations"
	@echo "  make collectstatic   Collect static files"
	@echo "  make superuser       Create Django superuser"
	@echo "  make shell           Django shell"
	@echo "  make bash            App container shell"
	@echo ""
	@echo "  make prod-up         Start production stack"
	@echo "  make prod-down       Stop production stack"
	@echo ""

# ============================
# Dev – Docker
# ============================
.PHONY: up down build logs restart
up:
	$(COMPOSE) $(DEV_COMPOSE) up --build -d

down:
	$(COMPOSE) $(DEV_COMPOSE) down

restart:
	$(COMPOSE) $(DEV_COMPOSE) down
	$(COMPOSE) $(DEV_COMPOSE) up --build

build:
	$(COMPOSE) $(DEV_COMPOSE) build

logs:
	$(COMPOSE) $(DEV_COMPOSE) logs -f $(APP_SERVICE)

# ============================
# Django tests with pytest
# ============================
.PHONY: test test-verbose test-coverage
test:
	$(COMPOSE) $(DEV_COMPOSE) exec $(APP_SERVICE) pytest

test-verbose:
	$(COMPOSE) $(DEV_COMPOSE) exec $(APP_SERVICE) pytest -v

test-coverage:
	$(COMPOSE) $(DEV_COMPOSE) exec $(APP_SERVICE) pytest --cov=.

# ============================
# Django management
# ============================
.PHONY: migrate makemigrations collectstatic superuser shell bash
migrate:
	$(COMPOSE) $(DEV_COMPOSE) run --rm $(APP_SERVICE) python manage.py migrate

makemigrations:
	$(COMPOSE) $(DEV_COMPOSE) run --rm $(APP_SERVICE) python manage.py makemigrations

collectstatic:
	$(COMPOSE) $(DEV_COMPOSE) run --rm $(APP_SERVICE) python manage.py collectstatic --noinput

superuser:
	$(COMPOSE) $(DEV_COMPOSE) run --rm $(APP_SERVICE) python manage.py createsuperuser

shell:
	$(COMPOSE) $(DEV_COMPOSE) run --rm $(APP_SERVICE) python manage.py shell

bash:
	$(COMPOSE) $(DEV_COMPOSE) exec $(APP_SERVICE) bash

# ============================
# Production
# ============================
.PHONY: prod-up prod-down prod-migrate prod-collectstatic
prod-up:
	$(COMPOSE) $(PROD_COMPOSE) up -d --build

prod-down:
	$(COMPOSE) $(PROD_COMPOSE) down

prod-migrate:
	$(COMPOSE) $(PROD_COMPOSE) run --rm $(APP_SERVICE) python manage.py migrate

prod-collectstatic:
	$(COMPOSE) $(PROD_COMPOSE) run --rm $(APP_SERVICE) python manage.py collectstatic --noinput
