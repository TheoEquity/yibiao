#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PNPM_ARCHIVE_BASE="$ROOT_DIR/vendor/pnpm/store-v10.tar.gz"
PNPM_MANIFEST="$ROOT_DIR/vendor/pnpm/store-manifest.txt"
PYTHON_REQUIREMENTS="$ROOT_DIR/vendor/python/requirements-docling.txt"
PYTHON_WHEEL_DIR="$ROOT_DIR/vendor/python/wheels"
PYTHON_WHEELS_ARCHIVE_BASE="$ROOT_DIR/vendor/python/wheels.tar.gz"
PYTHON_MANIFEST="$ROOT_DIR/vendor/python/wheels-manifest.txt"
TMP_PNPM_ARCHIVE="$ROOT_DIR/vendor/pnpm/.store-v10.tar.gz.tmp"
TMP_PYTHON_ARCHIVE="$ROOT_DIR/vendor/python/.wheels.tar.gz.tmp"

mkdir -p "$ROOT_DIR/vendor/pnpm" "$PYTHON_WHEEL_DIR"

echo "[1/3] Resolving pnpm store path"
PNPM_STORE_PATH="$(pnpm store path)"

echo "[2/3] Archiving pnpm store from $PNPM_STORE_PATH"
rm -f "$PNPM_ARCHIVE_BASE" "$PNPM_ARCHIVE_BASE".part-* "$TMP_PNPM_ARCHIVE"
tar -czf "$TMP_PNPM_ARCHIVE" -C "$PNPM_STORE_PATH/.." "$(basename "$PNPM_STORE_PATH")"
split -b 95m -d -a 3 "$TMP_PNPM_ARCHIVE" "$PNPM_ARCHIVE_BASE.part-"
rm -f "$TMP_PNPM_ARCHIVE"
{
  echo "pnpm_version=$(pnpm --version)"
  echo "store_path=$(basename "$PNPM_STORE_PATH")"
  echo "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$PNPM_MANIFEST"

echo "[3/3] Downloading Python wheels"
python3 -m pip download --dest "$PYTHON_WHEEL_DIR" -r "$PYTHON_REQUIREMENTS"

echo "Packaging Python wheels archive"
rm -f "$PYTHON_WHEELS_ARCHIVE_BASE" "$PYTHON_WHEELS_ARCHIVE_BASE".part-* "$TMP_PYTHON_ARCHIVE"
tar -czf "$TMP_PYTHON_ARCHIVE" -C "$ROOT_DIR/vendor/python" "$(basename "$PYTHON_WHEEL_DIR")"
split -b 95m -d -a 3 "$TMP_PYTHON_ARCHIVE" "$PYTHON_WHEELS_ARCHIVE_BASE.part-"
rm -f "$TMP_PYTHON_ARCHIVE"
{
  echo "python_version=$(python3 --version | awk '{print $2}')"
  echo "requirements_file=$(basename "$PYTHON_REQUIREMENTS")"
  echo "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$PYTHON_MANIFEST"

echo "Dependency cache ready:"
echo "- $PNPM_ARCHIVE_BASE.part-*"
echo "- $PNPM_MANIFEST"
echo "- $PYTHON_WHEELS_ARCHIVE_BASE.part-*"
echo "- $PYTHON_MANIFEST"
echo "- $PYTHON_WHEEL_DIR"
