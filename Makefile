TOOLS_DIR ?= .tools/bin
GO ?= go
CURL ?= curl
export PATH := $(abspath $(TOOLS_DIR)):$(PATH)

K6 ?= k6
K6_VERSION ?= v1.8.2
COMPOSE ?= docker compose
ESBUILD ?= esbuild
ESBUILD_VERSION ?= 0.25.12
BIOME ?= biome
BIOME_VERSION ?= 2.6.4
LOCAL_BIOME := $(TOOLS_DIR)/biome
ENTRY_POINTS := $(wildcard src/*.ts)

.PHONY: build release install-tools install-biome install-esbuild install-k6 \
	check-esbuild check-biome check-fixture-requirements check-compose fmt fmt-check lint \
	fixtures test test-ci

install-tools: install-biome install-esbuild install-k6

install-biome:
	@set -eu; \
	case "$$(uname -s)" in Linux) os=linux ;; Darwin) os=darwin ;; *) echo "unsupported OS: $$(uname -s)"; exit 1 ;; esac; \
	case "$$(uname -m)" in x86_64|amd64) arch=x64 ;; aarch64|arm64) arch=arm64 ;; *) echo "unsupported architecture: $$(uname -m)"; exit 1 ;; esac; \
	mkdir -p "$(TOOLS_DIR)"; \
	tmp=$$(mktemp "$(TOOLS_DIR)/biome.XXXXXX"); \
	trap 'rm -f "$$tmp"' EXIT; \
	$(CURL) --fail --location --silent --show-error --output "$$tmp" "https://github.com/biomejs/biome/releases/download/%40biomejs/biome%40$(BIOME_VERSION)/biome-$$os-$$arch"; \
	chmod +x "$$tmp"; \
	"$$tmp" --version | grep -qx "Version: $(BIOME_VERSION)"; \
	mv "$$tmp" "$(LOCAL_BIOME)"

install-esbuild:
	mkdir -p "$(TOOLS_DIR)"
	GOBIN="$(abspath $(TOOLS_DIR))" $(GO) install github.com/evanw/esbuild/cmd/esbuild@v$(ESBUILD_VERSION)

install-k6:
	mkdir -p "$(TOOLS_DIR)"
	GOBIN="$(abspath $(TOOLS_DIR))" $(GO) install go.k6.io/k6@$(K6_VERSION)

build: check-esbuild
	$(ESBUILD) $(ENTRY_POINTS) \
		--bundle --format=esm --platform=browser --sourcemap --outdir=dist \
		--external:k6 --external:k6/*

release: build

check-esbuild:
	@command -v $(ESBUILD) >/dev/null || { echo "esbuild is required; run make install-esbuild"; exit 1; }

check-biome:
	@command -v $(BIOME) >/dev/null || { echo "Biome is required; run make install-biome"; exit 1; }

check-fixture-requirements:
	@command -v bash >/dev/null || { echo "bash is required"; exit 1; }
	@command -v zip >/dev/null || { echo "zip is required"; exit 1; }

check-compose:
	@$(COMPOSE) version >/dev/null

fmt: check-biome
	$(BIOME) format --write src tests examples

fmt-check: check-biome
	$(BIOME) format src tests examples

lint: check-biome
	$(BIOME) lint --error-on-warnings src tests examples

fixtures: check-fixture-requirements
	bash tests/fixtures/prepare-lambda.sh

test: check-compose build fixtures
	$(COMPOSE) down -v --remove-orphans
	$(COMPOSE) up --build -d --wait --wait-timeout 300
	$(K6) run -q tests/index.js

test-ci: build fixtures
	$(K6) run -q tests/index.js
