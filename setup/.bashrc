# Load env vars from .env file (written by run.sh)
[ -f /home/sclaw/.env ] && . /home/sclaw/.env

# Claude Code aliases
alias c='claude'
alias cs='claude --dangerously-skip-permissions'

# Gemini alias

# alias g='gemini'
# Gemini alias - 通过代理访问（如果配置了 GEMINI_PROXY）
if [ -n "$GEMINI_PROXY" ]; then
    alias g='HTTPS_PROXY=$GEMINI_PROXY HTTP_PROXY=$GEMINI_PROXY gemini'
else
    alias g='gemini'
fi

# Claude --fs shortcut
claude() {
  local args=()
  for arg in "$@"; do
    if [[ "$arg" == "--fs" ]]; then
      args+=("--fork-session")
    else
      args+=("$arg")
    fi
  done
  command claude "${args[@]}"
}
