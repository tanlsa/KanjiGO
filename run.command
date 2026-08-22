#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
port="${KANJIGO_PORT:-8000}"
url="http://127.0.0.1:${port}/"

cd "$project_dir"
python3 -m http.server "$port" --bind 127.0.0.1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT INT TERM

if command -v open >/dev/null 2>&1; then
  open "$url"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$url"
fi

echo "KanjiGO đang chạy tại $url"
echo "Nhấn Ctrl+C để dừng server."
wait "$server_pid"
