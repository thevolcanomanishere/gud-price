.PHONY: all test lint format build generate clean

all: lint test build

# ── Generate ─────────────────────────────────────────────────────────────────

generate:
	node codegen/generate.js

# ── Test ─────────────────────────────────────────────────────────────────────

test: test-ts test-go test-rust test-python

test-ts:
	pnpm test:run

test-go:
	cd generated/go && go test -short ./...

test-rust:
	cd generated/rust && cargo test

test-python:
	cd generated/python && python -m unittest test_rpc test_feeds -v

# ── Lint ─────────────────────────────────────────────────────────────────────

lint: lint-ts lint-go lint-rust lint-python

lint-ts:
	pnpm tsc --noEmit

lint-go:
	cd generated/go && go vet ./...

lint-rust:
	cd generated/rust && cargo clippy -- -D warnings

lint-python:
	cd generated/python && uvx ruff check .

# ── Format ───────────────────────────────────────────────────────────────────

format: format-ts format-go format-rust format-python

format-ts:
	pnpm prettier --write 'src/**/*.ts' 'example/**/*.ts'

format-go:
	cd generated/go && gofmt -w .

format-rust:
	cd generated/rust && cargo fmt

format-python:
	cd generated/python && uvx ruff format . && uvx ruff check --fix .

# ── Format check (CI) ───────────────────────────────────────────────────────

format-check: format-check-ts format-check-go format-check-rust format-check-python

format-check-ts:
	pnpm prettier --check 'src/**/*.ts' 'example/**/*.ts'

format-check-go:
	@cd generated/go && test -z "$$(gofmt -l .)" || (gofmt -l . && exit 1)

format-check-rust:
	cd generated/rust && cargo fmt -- --check

format-check-python:
	cd generated/python && uvx ruff format --check . && uvx ruff check .

# ── Build ────────────────────────────────────────────────────────────────────

build:
	pnpm build

# ── Clean ────────────────────────────────────────────────────────────────────

clean:
	rm -rf dist
	cd generated/rust && cargo clean
