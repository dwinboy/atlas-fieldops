COMPOSE ?= docker compose
PYTHON ?= python3

.PHONY: bootstrap seed-admin dev test lint format docker-build docker-config docker-logs docker-ps docker-up docker-down docker-clean backend frontend mobile

bootstrap:
	$(PYTHON) -m venv backend/.venv
	cd backend && . .venv/bin/activate && pip install -e ".[dev]"
	cd frontend && npm install
	cd mobile && npm install
	cd ai-services && $(PYTHON) -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"

dev:
	$(COMPOSE) up

seed-admin:
	cd backend && . .venv/bin/activate && cd .. && python scripts/seed.py

docker-up:
	$(COMPOSE) up -d

docker-build:
	$(COMPOSE) build

docker-config:
	$(COMPOSE) config

docker-logs:
	$(COMPOSE) logs -f --tail=100

docker-ps:
	$(COMPOSE) ps

docker-down:
	$(COMPOSE) down

docker-clean:
	$(COMPOSE) down --volumes --remove-orphans

backend:
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm run dev

mobile:
	cd mobile && npm run start

test:
	cd backend && . .venv/bin/activate && pytest
	cd ai-services && . .venv/bin/activate && pytest
	cd frontend && npm test -- --run

lint:
	cd backend && . .venv/bin/activate && ruff check app tests && mypy app
	cd ai-services && . .venv/bin/activate && ruff check app tests && mypy app
	cd frontend && npm run lint

format:
	cd backend && . .venv/bin/activate && ruff format app tests
	cd ai-services && . .venv/bin/activate && ruff format app tests
	cd frontend && npm run format
