#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PNPM_ARCHIVE_BASE="$ROOT_DIR/vendor/pnpm/store-v10.tar.gz"
PYTHON_REQUIREMENTS="$ROOT_DIR/vendor/python/requirements-docling.txt"
PYTHON_WHEEL_DIR="$ROOT_DIR/vendor/python/wheels"
PYTHON_WHEELS_ARCHIVE_BASE="$ROOT_DIR/vendor/python/wheels.tar.gz"
TARGET_PNPM_STORE_PATH="$(pnpm store path)"
TMP_PNPM_ARCHIVE="$ROOT_DIR/vendor/pnpm/.store-v10.tar.gz.tmp"
TMP_PYTHON_ARCHIVE="$ROOT_DIR/vendor/python/.wheels.tar.gz.tmp"

if ls "$PNPM_ARCHIVE_BASE".part-* >/dev/null 2>&1; then
  echo "[1/3] Restoring pnpm store to $TARGET_PNPM_STORE_PATH"
  mkdir -p "$TARGET_PNPM_STORE_PATH"
  cat "$PNPM_ARCHIVE_BASE".part-* > "$TMP_PNPM_ARCHIVE"
  tar -xzf "$TMP_PNPM_ARCHIVE" -C "$TARGET_PNPM_STORE_PATH/.."
  rm -f "$TMP_PNPM_ARCHIVE"
else
  echo "[1/3] Skipping pnpm store restore: archive not found"
fi

echo "[2/3] Installing Node dependencies from lockfile"
pnpm install --offline --frozen-lockfile

if [ ! -d "$PYTHON_WHEEL_DIR" ] && ls "$PYTHON_WHEELS_ARCHIVE_BASE".part-* >/dev/null 2>&1; then
  echo "[3/3] Restoring Python wheels archive"
  cat "$PYTHON_WHEELS_ARCHIVE_BASE".part-* > "$TMP_PYTHON_ARCHIVE"
  tar -xzf "$TMP_PYTHON_ARCHIVE" -C "$ROOT_DIR/vendor/python"
  rm -f "$TMP_PYTHON_ARCHIVE"
fi

if [ -d "$PYTHON_WHEEL_DIR" ]; then
  echo "[3/3] Installing Python dependencies from local wheels"
  python3 -m pip install --break-system-packages --no-index --find-links "$PYTHON_WHEEL_DIR" -r "$PYTHON_REQUIREMENTS"
else
  echo "[3/3] Skipping Python restore: wheel directory not found"
fi
