#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

printf '\n==> Running backend verification\n'
(cd "$ROOT_DIR/backend" && go test ./...)

printf '\n==> Running frontend verification\n'
(cd "$ROOT_DIR/frontend" && pnpm test)
