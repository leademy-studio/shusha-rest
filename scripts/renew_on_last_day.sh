#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
CERT_DIR="$ROOT_DIR/traefik/certs"
CERT_PATH="$CERT_DIR/cert.pem"
KEY_PATH="$CERT_DIR/key.pem"
ACME_PATH="$ROOT_DIR/traefik/acme.json"
DYNAMIC_CERTS="$ROOT_DIR/traefik/dynamic/certs.yml"

LABEL_REGEX='traefik.http.routers.shusha-rest.tls.certresolver=letsencrypt'
LABEL_LINE='      - "traefik.http.routers.shusha-rest.tls.certresolver=letsencrypt"'
THRESHOLD_SECONDS=86400

needs_app_recreate=0
needs_traefik_restart=0

# Ensure static cert config exists for Traefik file provider.
if [ ! -f "$DYNAMIC_CERTS" ] || ! grep -q 'certFile: /etc/traefik/certs/cert.pem' "$DYNAMIC_CERTS"; then
  cat > "$DYNAMIC_CERTS" <<'YAML'
tls:
  certificates:
    - certFile: /etc/traefik/certs/cert.pem
      keyFile: /etc/traefik/certs/key.pem
YAML
fi

seconds_left=0
if [ -f "$CERT_PATH" ]; then
  end_date=$(openssl x509 -in "$CERT_PATH" -noout -enddate 2>/dev/null | cut -d= -f2 || true)
  if [ -n "$end_date" ]; then
    end_ts=$(date -d "$end_date" +%s)
    now_ts=$(date +%s)
    seconds_left=$(( end_ts - now_ts ))
  fi
fi

need_acme=0
if [ "$seconds_left" -le "$THRESHOLD_SECONDS" ]; then
  need_acme=1
fi

if [ "$need_acme" -eq 1 ]; then
  if ! grep -q "$LABEL_REGEX" "$COMPOSE_FILE"; then
    sed -i "/traefik.http.routers.shusha-rest.tls=true/a\\$LABEL_LINE" "$COMPOSE_FILE"
    needs_app_recreate=1
  fi
else
  if grep -q "$LABEL_REGEX" "$COMPOSE_FILE"; then
    sed -i "/$LABEL_REGEX/d" "$COMPOSE_FILE"
    needs_app_recreate=1
  fi
fi

updated="0"
updated=$(ACME_PATH="$ACME_PATH" CERT_PATH="$CERT_PATH" KEY_PATH="$KEY_PATH" python3 - <<'PY'
import base64
import json
import os
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

acme_path = os.environ["ACME_PATH"]
cert_path = os.environ["CERT_PATH"]
key_path = os.environ["KEY_PATH"]
domains = {"shusha72.ru", "www.shusha72.ru"}

def ensure_pem(raw, kind):
    if raw.startswith(b"-----BEGIN"):
        return raw
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(raw)
        tmp_path = tmp.name
    out_path = tmp_path + ".pem"
    try:
        if kind == "cert":
            cmd = ["openssl", "x509", "-inform", "der", "-in", tmp_path, "-out", out_path]
        else:
            cmd = ["openssl", "pkey", "-inform", "der", "-in", tmp_path, "-out", out_path]
        subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return Path(out_path).read_bytes()
    finally:
        for p in (tmp_path, out_path):
            try:
                os.unlink(p)
            except OSError:
                pass

def end_ts_from_pem(pem_bytes):
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(pem_bytes)
        tmp_path = tmp.name
    try:
        out = subprocess.check_output(
            ["openssl", "x509", "-noout", "-enddate", "-in", tmp_path],
            text=True,
        ).strip()
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
    if "=" not in out:
        return 0
    date_str = out.split("=", 1)[1].strip()
    dt = datetime.strptime(date_str, "%b %d %H:%M:%S %Y %Z")
    return int(dt.replace(tzinfo=timezone.utc).timestamp())

def static_end_ts():
    try:
        out = subprocess.check_output(
            ["openssl", "x509", "-noout", "-enddate", "-in", cert_path],
            text=True,
        ).strip()
    except Exception:
        return 0
    if "=" not in out:
        return 0
    date_str = out.split("=", 1)[1].strip()
    dt = datetime.strptime(date_str, "%b %d %H:%M:%S %Y %Z")
    return int(dt.replace(tzinfo=timezone.utc).timestamp())

acme_file = Path(acme_path)
if not acme_file.exists() or acme_file.stat().st_size < 100:
    print("0")
    raise SystemExit(0)

try:
    data = json.loads(acme_file.read_text())
except Exception:
    print("0")
    raise SystemExit(0)

best_ts = 0
best_cert = None
best_key = None

for resolver in data.values():
    if not isinstance(resolver, dict):
        continue
    certs = resolver.get("Certificates") or []
    for cert in certs:
        domain = cert.get("domain", {})
        if not isinstance(domain, dict):
            continue
        domain_set = set()
        main = domain.get("main")
        if main:
            domain_set.add(main)
        for d in domain.get("sans") or []:
            if d:
                domain_set.add(d)
        if not domain_set.intersection(domains):
            continue
        cert_b64 = cert.get("certificate")
        key_b64 = cert.get("key")
        if not cert_b64 or not key_b64:
            continue
        try:
            cert_raw = base64.b64decode(cert_b64)
            key_raw = base64.b64decode(key_b64)
        except Exception:
            continue
        cert_pem = ensure_pem(cert_raw, "cert")
        key_pem = ensure_pem(key_raw, "key")
        end_ts = end_ts_from_pem(cert_pem)
        if end_ts > best_ts:
            best_ts = end_ts
            best_cert = cert_pem
            best_key = key_pem

if not best_cert or not best_key:
    print("0")
    raise SystemExit(0)

current_ts = static_end_ts()
if best_ts <= current_ts:
    print("0")
    raise SystemExit(0)

timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
for path in (cert_path, key_path):
    p = Path(path)
    if p.exists():
        p.rename(f"{path}.bak-{timestamp}")

Path(cert_path).write_bytes(best_cert)
Path(key_path).write_bytes(best_key)
os.chmod(cert_path, 0o644)
os.chmod(key_path, 0o600)

print("1")
PY
) || updated="0"

if [ "$updated" = "1" ]; then
  needs_traefik_restart=1
  if grep -q "$LABEL_REGEX" "$COMPOSE_FILE"; then
    sed -i "/$LABEL_REGEX/d" "$COMPOSE_FILE"
    needs_app_recreate=1
  fi
fi

if [ "$needs_app_recreate" -eq 1 ]; then
  $COMPOSE up -d --no-deps --force-recreate app
fi

if [ "$needs_traefik_restart" -eq 1 ]; then
  $COMPOSE restart traefik
fi
