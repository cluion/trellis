COMPOSE := docker compose --env-file docker/.env -f docker/compose.yaml

.PHONY: build setup up down test lint audit secret-scan ci

build:
	$(COMPOSE) build app

setup:
	$(COMPOSE) --profile setup run --rm setup

up:
	$(COMPOSE) up -d watch demo

down:
	$(COMPOSE) down

test:
	$(COMPOSE) run --rm app pnpm test

lint:
	$(COMPOSE) run --rm app sh -c 'pnpm lint && pnpm format'

audit:
	$(COMPOSE) run --rm app pnpm audit:dependencies

secret-scan:
	$(COMPOSE) run --rm app gitleaks git --redact --verbose .

ci:
	$(COMPOSE) run --rm app pnpm ci:check
