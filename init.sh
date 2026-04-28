#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Claude Code for GTM — Init Script
# Run:  bash init.sh              (Session 1 setup)
#       bash init.sh --session=3  (add Session 3 keys)
#       bash init.sh --session=5  (add Session 5 keys)
# Safe to re-run — existing keys are never overwritten.
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

# ── Parse --session flag ───────────────────────────────────────────────────────
SESSION=1
for arg in "$@"; do
  case $arg in
    --session=*) SESSION="${arg#*=}" ;;
  esac
done

echo ""
echo -e "${BOLD}Claude Code for GTM — Setup${NC}"
if [ "$SESSION" -gt 1 ]; then
  echo -e "${DIM}Adding keys for Session ${SESSION}${NC}"
fi
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

get_env_value() {
  grep "^$1=" .env 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}

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
  local session_hint=$4
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
    echo -e "${PASS} ${key} saved"
  else
    echo -e "${WARN} Skipped — ${session_hint}"
  fi
}

# ── Session 1 keys (always shown) ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}── Session 1 ─────────────────────────────────────────────${NC}"

prompt_for_key "APIFY_API_KEY" "Apify API Key" "https://console.apify.com/account/integrations" "needed before Session 1"

# ── Session 3 keys ────────────────────────────────────────────────────────────
if [ "$SESSION" -ge 3 ]; then
  echo ""
  echo -e "${BOLD}── Session 3 — Enrichment ────────────────────────────────${NC}"

  prompt_for_key "LEADMAGIC_API_KEY" "LeadMagic API Key" "https://app.leadmagic.io → API Keys" "needed before Session 3"
  prompt_for_key "AIARK_API_KEY"     "AI Ark API Key"   "https://app.ai-ark.com → API"        "needed before Session 3"
  prompt_for_key "EXA_API_KEY"       "Exa API Key"      "https://dashboard.exa.ai/api-keys"   "needed before Session 3"
  prompt_for_key "OPENAI_API_KEY"    "OpenAI API Key"   "https://platform.openai.com/api-keys" "needed before Session 3"
fi

# ── Session 4 keys ────────────────────────────────────────────────────────────
if [ "$SESSION" -ge 4 ]; then
  echo ""
  echo -e "${BOLD}── Session 4 — Campaign Launch ───────────────────────────${NC}"

  prompt_for_key "INSTANTLY_API_KEY"      "Instantly API Key"      "https://app.instantly.ai/app/settings/integrations" "needed before Session 4"
  prompt_for_key "REVYOPS_MASTER_API_KEY" "RevyOps Master API Key" "https://app.revyops.com/api/docs"                  "needed before Session 4"
fi

# ── Session 5 keys ────────────────────────────────────────────────────────────
if [ "$SESSION" -ge 5 ]; then
  echo ""
  echo -e "${BOLD}── Session 5 — Production Deploy ─────────────────────────${NC}"

  prompt_for_key "TRIGGER_SECRET_KEY"      "Trigger.dev Dev Secret Key"  "https://cloud.trigger.dev → your project → API keys" "needed before Session 5"
  prompt_for_key "TRIGGER_PROD_SECRET_KEY" "Trigger.dev Prod Secret Key" "https://cloud.trigger.dev → your project → API keys" "needed before Session 5"
  prompt_for_key "N8N_API_KEY"             "n8n API Key"                 "https://<your-instance>.app.n8n.cloud → Settings → API" "needed before Session 5"
  prompt_for_key "SLACK_BOT_TOKEN"         "Slack Bot Token"             "https://api.slack.com/apps → OAuth & Permissions"   "needed before Session 5"

  # Manual config (no prompt — set directly in .env)
  if [ -z "$(get_env_value INSTANTLY_CAMPAIGN_ID)" ]; then
    echo -e "${WARN} Set INSTANTLY_CAMPAIGN_ID in .env once your Instantly campaign exists"
  fi
  if [ -z "$(get_env_value SLACK_NOTIFY_CHANNEL)" ]; then
    echo -e "${WARN} Set SLACK_NOTIFY_CHANNEL in .env to the channel ID where the bot posts summaries"
  fi
  if [ -z "$(get_env_value N8N_API_URL)" ]; then
    echo -e "${WARN} Set N8N_API_URL in .env (https://<your-instance>.app.n8n.cloud/api/v1)"
  fi
fi

# ── .mcp.json (only if example present) ───────────────────────────────────────
echo ""
if [ -f .mcp.json.example ] && [ ! -f .mcp.json ]; then
  APIFY_KEY=$(get_env_value "APIFY_API_KEY")
  if [ -n "$APIFY_KEY" ]; then
    sed "s/YOUR_APIFY_API_KEY/${APIFY_KEY}/" .mcp.json.example > .mcp.json
    echo -e "${PASS} .mcp.json configured"
  else
    cp .mcp.json.example .mcp.json
    echo -e "${WARN} .mcp.json created — re-run after adding APIFY_API_KEY to complete"
  fi
elif [ -f .mcp.json ]; then
  echo -e "${PASS} .mcp.json already exists"
fi

# ── CLI Tools ─────────────────────────────────────────────────────────────────
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

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}─────────────────────────────────────────────────────────${NC}"
echo ""

READY=true
[ -z "$(get_env_value APIFY_API_KEY)" ] && echo -e "${FAIL} APIFY_API_KEY missing" && READY=false
[ "$GWS_OK" = false ] && echo -e "${WARN} gws CLI not installed (needed for Google Sheets in Session 1)"

if [ "$READY" = true ]; then
  echo -e "${GREEN}${BOLD}Ready for Session ${SESSION}.${NC}"
  echo ""
  echo -e "   Open Claude Code in this folder:"
  echo -e "   ${DIM}VS Code: Ctrl+Shift+P → \"Open Claude Code\"${NC}"
  echo -e "   ${DIM}Terminal: claude${NC}"
  if [ "$SESSION" -lt 5 ]; then
    echo ""
    echo -e "   ${DIM}Before Session $((SESSION + 1)): git pull && bash init.sh --session=$((SESSION + 1))${NC}"
  fi
else
  echo ""
  echo -e "${YELLOW}Almost there.${NC} Fix the items above and re-run ${DIM}bash init.sh${NC}"
fi

echo ""
