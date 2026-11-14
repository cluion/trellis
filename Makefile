COMPOSE := docker compose --env-file docker/.env -f docker/compose.yaml

.PHONY: build setup up down test lint audit secret-scan ci browser-build e2e-vue

E2E_PACKAGES ?= published

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

browser-build:
	docker build -f docker/Dockerfile.browser -t trellis:browser .

e2e-vue: browser-build
	docker run --rm --init --ipc=host \
		--user "$$(id -u):$$(id -g)" \
		-e npm_config_cache=/tmp/npm-cache \
		-e npm_config_store_dir=/workspace/.pnpm-store \
		-e TRELLIS_E2E_PACKAGES=$(E2E_PACKAGES) \
		-e CI \
		-v "$(CURDIR):/workspace" trellis:browser sh -c \
		'if [ "$$TRELLIS_E2E_PACKAGES" = checkout ]; then pnpm install --frozen-lockfile && pnpm build || exit; fi; \
		npm ci --prefix tests/e2e/vue-server-side && \
		npm --prefix tests/e2e/vue-server-side run typecheck && \
		npm run test:e2e:vue'
