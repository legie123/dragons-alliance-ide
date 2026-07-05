#!/usr/bin/env bash
# ============================================================================
# Dragons Alliance IDE — Google APIs setup helper
#
# Makes the "Google APIs" superpower go LIVE. It automates everything that CAN
# be scripted (open the exact consoles, write ~/.config/dai/google.json at 0600,
# verify state) and tells you the 3 things only YOU can do (they need your
# Google account + a browser consent the app must complete).
#
# What the DAI app actually needs (read from src/main/gdrive.ts):
#   - OAuth client of type "Desktop app"  (loopback 127.0.0.1 redirect + PKCE)
#   - Enabled APIs: Google Drive, Google Sheets, Google Forms
#   - Config file ~/.config/dai/google.json = { clientId, clientSecret, refreshToken }
#     configured = clientId+clientSecret present  → status "ready"
#     signedIn   = refreshToken present           → status "LIVE"
#   NOTE: current scopes are Drive + Sheets + Forms only. Gmail is shown in the
#         UI text but is NOT requested yet — don't expect Gmail to work until a
#         Gmail scope is added to SCOPES in gdrive.ts.
#
# Usage:
#   ./scripts/google-setup.sh              # show the 3-step plan + open consoles + state
#   ./scripts/google-setup.sh --open       # just open the Google Cloud Console pages
#   ./scripts/google-setup.sh --save ID SECRET   # write client id/secret to google.json (0600)
#   ./scripts/google-setup.sh --check      # print current configured/signedIn state
# ============================================================================
set -euo pipefail

CFG_DIR="$HOME/.config/dai"
CFG="$CFG_DIR/google.json"
PY=/usr/bin/python3

c_bold() { printf '\033[1m%s\033[0m\n' "$1"; }
c_dim()  { printf '\033[2m%s\033[0m\n' "$1"; }
c_ok()   { printf '\033[32m%s\033[0m\n' "$1"; }
c_warn() { printf '\033[33m%s\033[0m\n' "$1"; }

state() {
  if [ ! -f "$CFG" ]; then
    c_warn "state: google.json MISSING — nothing configured yet"
    return
  fi
  "$PY" - "$CFG" <<'PYEOF'
import json, sys
c = json.load(open(sys.argv[1]))
conf = bool(c.get("clientId") and c.get("clientSecret"))
signed = bool(c.get("refreshToken"))
email = c.get("email") or "-"
print(f"state: configured={conf}  signedIn={signed}  account={email}")
if signed:   print("  → superpower should read LIVE.")
elif conf:   print("  → configured. Do STEP 3 (sign in) in the app to go LIVE.")
else:        print("  → creds incomplete. Do STEP 2.")
PYEOF
}

open_consoles() {
  c_dim "Opening Google Cloud Console pages in your browser…"
  # project picker / create, then the three API library pages, then credentials
  open "https://console.cloud.google.com/projectcreate" 2>/dev/null || true
  sleep 1
  open "https://console.cloud.google.com/apis/library/drive.googleapis.com"  2>/dev/null || true
  open "https://console.cloud.google.com/apis/library/sheets.googleapis.com" 2>/dev/null || true
  open "https://console.cloud.google.com/apis/library/forms.googleapis.com"  2>/dev/null || true
  open "https://console.cloud.google.com/apis/credentials/consent"           2>/dev/null || true
  open "https://console.cloud.google.com/apis/credentials"                   2>/dev/null || true
}

save_creds() {
  local id="$1" secret="$2"
  [ -n "$id" ] && [ -n "$secret" ] || { c_warn "usage: --save <clientId> <clientSecret>"; exit 1; }
  mkdir -p "$CFG_DIR"
  CID="$id" CSECRET="$secret" CFG="$CFG" "$PY" - <<'PYEOF'
import json, os
p = os.environ["CFG"]
try:
    c = json.load(open(p))
except Exception:
    c = {}
c["clientId"] = os.environ["CID"].strip()
c["clientSecret"] = os.environ["CSECRET"].strip()
# changing the client invalidates any old grant — force a fresh sign-in
c.pop("refreshToken", None); c.pop("email", None)
json.dump(c, open(p, "w"), indent=2)
os.chmod(p, 0o600)
print("wrote", p, "(chmod 600)")
PYEOF
  c_ok "Saved. Now do STEP 3: open the app → Keys → Sign in with Google."
}

plan() {
  c_bold "GOOGLE APIs → LIVE  ·  plan în 3 pași"
  echo
  c_bold "PAS 1 — Google Cloud (o singură dată, în browser)"
  echo "  a. Creează un proiect (sau alege unul existent)."
  echo "  b. Enable 3 APIs:  Google Drive · Google Sheets · Google Forms."
  echo "  c. OAuth consent screen:  User type = External → completează nume + email →"
  echo "     la 'Test users' adaugă-ți PROPRIUL email (altfel consimțământul e blocat)."
  echo "  d. Credentials → Create credentials → OAuth client ID →"
  c_bold "     Application type = Desktop app  (IMPORTANT — nu Web)."
  echo "     Nu trebuie să configurezi niciun redirect URI: Desktop app permite"
  echo "     automat loopback 127.0.0.1 (exact ce folosește app-ul)."
  echo "  e. Copiază Client ID + Client secret."
  echo
  c_bold "PAS 2 — Bagă cheile (o comandă, sau din app)"
  echo "  Varianta rapidă (aici, în terminal):"
  c_dim  "     ./scripts/google-setup.sh --save '<CLIENT_ID>' '<CLIENT_SECRET>'"
  echo "  SAU în app:  Keys (credentials vault) → paste Client ID + secret → Save."
  echo
  c_bold "PAS 3 — Sign in (în app — doar app-ul poate face OAuth)"
  echo "  Deschide app-ul → Keys / Google → 'Sign in with Google' → aprobă în browser."
  echo "  App-ul prinde codul pe portul loopback, salvează refresh token → status LIVE."
  echo
  c_warn "Note oneste:"
  echo "  · Scope-uri cerute acum: Drive + Sheets + Forms (NU Gmail încă)."
  echo "  · Dacă lași consent screen în 'Testing', refresh-token-ul expiră ~7 zile;"
  echo "    pentru permanent apasă 'Publish app' (rămâne al tău, doar tu ești user)."
  echo "  · Cheile stau LOCAL în ~/.config/dai/google.json (chmod 600), nu în repo."
  echo
  state
}

case "${1:-}" in
  --open)  open_consoles ;;
  --save)  save_creds "${2:-}" "${3:-}" ;;
  --check) state ;;
  --help|-h) grep '^#' "$0" | sed 's/^# \{0,1\}//' ;;
  "")      plan; echo; open_consoles ;;
  *)       c_warn "unknown option: $1 (try --help)"; exit 1 ;;
esac
