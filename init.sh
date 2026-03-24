#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Claude Code for GTM — Init Script
# Sets up your environment for Session 1.
# Run: bash init.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

PASS="${GREEN}✓${NC}"
WARN="${YELLOW}⚠${NC}"
FAIL="${RED}✗${NC}"

echo ""
echo -e "${BOLD}Claude Code for GTM — Setup${NC}"
echo -e "${DIM}thegtmarchitects.com${NC}"
echo ""

# ── 1. Node.js ────────────────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo -e "${FAIL} Node.js not found. Install from https://nodejs.org (v18+) then re-run."
  exit 1
fi

NODE_MAJOR=$(node -e "process.stdout.write(process.version.split('.')[0].replace('v',''))")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo -e "${FAIL} Node.js v${NODE_MAJOR} found — need v18+. Upgrade at https://nodejs.org"
  exit 1
fi
echo -e "${PASS} Node.js $(node --version)"

# ── 2. npm install ────────────────────────────────────────────────────────────
echo -e "${DIM}   Installing dependencies...${NC}"
npm install --silent 2>/dev/null
echo -e "${PASS} Dependencies installed"

# ── 3. .env setup ─────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
fi

# Helper: read a value from .env
get_env_value() {
  grep "^$1=" .env 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}

# Helper: write/update a value in .env
set_env_value() {
  local key=$1
  local value=$2
  if grep -q "^${key}=" .env 2>/dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" .env
    else
      sed -i "s|^${key}=.*|${key}=${value}|" .env
    fi
  else
    echo "${key}=${value}" >> .env
  fi
}

prompt_for_key() {
  local key=$1
  local label=$2
  local url=$3
  local current
  current=$(get_env_value "$key")

  if [ -n "$current" ]; then
    echo -e "${PASS} ${key} already set"
    return
  fi

  echo ""
  echo -e "${YELLOW}?${NC}  ${BOLD}${label}${NC}"
  echo -e "   ${DIM}${url}${NC}"
  echo -n "   Paste key: "
  read -r value
  if [ -n "$value" ]; then
    set_env_value "$key" "$value"
    echo -e "${PASS} ${key} saved to .env"
  else
    echo -e "${WARN} ${key} skipped — you'll need this before Session 1"
  fi
}

echo ""
echo -e "${BOLD}── API Keys (Session 1) ──────────────────────────────────${NC}"
echo -e "${DIM}   Keys for later sessions can be added to .env as you go.${NC}"

prompt_for_key "APIFY_API_KEY"      "Apify API Key"      "https://console.apify.com/account/integrations"
prompt_for_key "ANTHROPIC_API_KEY"  "Anthropic API Key"  "https://console.anthropic.com/keys"

# ── 4. .mcp.json ─────────────────────────────────────────────────────────────
echo ""
if [ ! -f .mcp.json ]; then
  APIFY_KEY=$(get_env_value "APIFY_API_KEY")
  if [ -n "$APIFY_KEY" ]; then
    sed "s/YOUR_APIFY_API_KEY/${APIFY_KEY}/" .mcp.json.example > .mcp.json
    echo -e "${PASS} .mcp.json configured"
  else
    cp .mcp.json.example .mcp.json
    echo -e "${WARN} .mcp.json created — add your APIFY_API_KEY to .env and re-run to complete"
  fi
else
  echo -e "${PASS} .mcp.json already exists"
fi

# ── 5. gws CLI ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}── CLI Tools ─────────────────────────────────────────────${NC}"

GWS_OK=false
if command -v gws &> /dev/null; then
  echo -e "${PASS} gws CLI installed"
  GWS_OK=true
else
  echo -e "${WARN} gws CLI not found"
  echo -e "   ${DIM}Ask Claude Code: \"Install the gws CLI and walk me through auth\"${NC}"
  echo -e "   ${DIM}Or run: npm install -g @googleworkspace/cli && gws auth login${NC}"
fi

# ── 6. Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}─────────────────────────────────────────────────────────${NC}"
echo ""

APIFY_FINAL=$(get_env_value "APIFY_API_KEY")
ANTHROPIC_FINAL=$(get_env_value "ANTHROPIC_API_KEY")

READY=true

[ -z "$APIFY_FINAL" ]    && echo -e "${FAIL} APIFY_API_KEY missing" && READY=false
[ -z "$ANTHROPIC_FINAL" ] && echo -e "${FAIL} ANTHROPIC_API_KEY missing" && READY=false
[ "$GWS_OK" = false ]    && echo -e "${WARN} gws CLI not installed (needed for Google Sheets in Session 1)"

if [ "$READY" = true ]; then
  echo -e "${GREEN}${BOLD}Ready for Session 1.${NC}"
  echo ""
  echo -e "   Open Claude Code in this folder:"
  echo -e "   ${DIM}VS Code: Ctrl+Shift+P → \"Open Claude Code\"${NC}"
  echo -e "   ${DIM}Terminal: claude${NC}"
else
  echo ""
  echo -e "${YELLOW}Almost there.${NC} Fix the items above and re-run ${DIM}bash init.sh${NC}"
fi

echo ""
