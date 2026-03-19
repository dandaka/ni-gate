# ni-gate — Secret Gate for AI Agents

**Date:** 2026-03-19
**Status:** v1 — Ready for implementation

## Problem

AI agents (Claude Code, etc.) running in YOLO mode need access to API secrets. Current approach loads ALL secrets into the agent's environment at startup, creating a honeypot vulnerable to prompt injection and accidental exfiltration.

## Solution

CLI tool that acts as a gate between the agent and secrets. The agent never sees secret values directly — it requests them by name, ni-gate prompts the user for approval, then injects them into a single command's subprocess environment. Secrets exist only for the duration of that command.

## Principles

- **No secrets in agent memory** — secrets are never in env, never in context
- **Explicit request** — agent asks for what it needs by name
- **User approves** — every secret access is approved (or pre-approved) by the user
- **Deny-by-default config** — when a var is first requested, it's added to rules.yaml with `deny` permission and the user is prompted. The config populates itself through use, always starting from deny.
- **Minimal friction** — one CLI command, familiar UX (like sudo but for secrets)

## Architecture

```
Agent (no secrets in env)
  │
  │  ni-gate run TELEGRAM_BOT_TOKEN -- curl api.telegram.org/...
  ▼
┌──────────────────────────────┐
│           ni-gate            │
│                              │
│  1. Parse requested vars     │
│  2. Check permission         │
│  3. Prompt user (if needed)  │
│  4. Check access rules       │
│     (command + URL whitelist) │
│  5. Fetch from backend       │
│  6. Inject into subprocess   │
│  7. Run command              │
│  8. Secrets gone on exit     │
└──────────────────────────────┘
  │
  │  backend.get(TELEGRAM_BOT_TOKEN)
  ▼
┌──────────────────────────────┐
│  Secret Backend (pluggable)  │
│  - Infisical                 │
│  - .env file                 │
│  - 1Password CLI             │
│  - HashiCorp Vault           │
│  - OS Keychain               │
└──────────────────────────────┘
```

## CLI Interface

### `ni-gate run <vars> -- <command>`

Run a command with specific secrets injected as env vars into the subprocess.

```bash
# Request specific var:
ni-gate run TELEGRAM_BOT_TOKEN -- curl -X POST \
  'https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage' \
  -d '{"chat_id":123,"text":"hello"}'

# Request multiple vars:
ni-gate run TELEGRAM_BOT_TOKEN,LINEAR_API_KEY -- bash -c 'curl -H "Authorization: Bearer $LINEAR_API_KEY" ...'

```

**How the command sees secrets:**
ni-gate exports approved vars into the subprocess environment. The command must reference them as env vars (`$VAR_NAME`). Two patterns:

1. **Wrap in `bash -c`** — for inline commands that need shell expansion:
   `ni-gate run TOKEN -- bash -c 'curl -H "Authorization: $TOKEN" https://...'`
   (single quotes prevent the agent's shell from expanding `$TOKEN`; the inner bash expands it)

2. **Run a script** — for complex commands:
   `ni-gate run TOKEN -- ./my-script.sh`
   (script reads `$TOKEN` from its env)

Note: the agent's own shell never sees the secret value. The single-quoted `$VAR` is passed literally to ni-gate, which spawns a subprocess with the var set.

**Behavior:**

1. Parse `<vars>` — comma-separated var names
2. Look up each var in `~/.ni-gate/rules.yaml`
3. For each var, check permission level:
   - `always` → auto-approve
   - `ask` → prompt user in terminal
   - `deny` → block, print error, exit 1
   - (no rule) → add var to rules.yaml as `deny`, then prompt user. If user approves (always/once), update the saved level. If user denies, it stays `deny`. Config file is always populated so user can review and edit it later.
4. **Check access rules** (if configured for this var):
   - Extract the command binary name (first arg after `--`)
   - Extract any URLs from the command arguments
   - If `allow_commands` is set and command is not in the list → exit 12
   - If `allow_urls` is set and no URL in args matches the patterns → exit 12
   - If neither is set → no restrictions, pass through
5. Fetch approved vars from backend (only the specific vars, not everything)
6. Export as env vars into subprocess (never into the parent/agent shell)
7. Execute `<command>` as a child process with those env vars
8. Return command's exit code

### `ni-gate list`

Show available var names (never values).

```
$ ni-gate list
TELEGRAM_BOT_TOKEN       [always]
TELEGRAM_BOT_TOKEN_KIRA  [deny]
LINEAR_API_KEY           [always]
GITHUB_TOKEN             [always]
GITHUB_APP_KEY           [no rule]
STRIPE_SECRET_KEY        [ask]
STRIPE_WEBHOOK_SECRET    [no rule]
GA_PROPERTY_ID           [no rule]
GOOGLE_CREDENTIALS       [no rule]
```

**Behavior:**

1. Connect to secret backend
2. List all secret names (flat list)
3. Print names only, never values
4. Show permission level if configured, or `[no rule]` if not yet requested

### `ni-gate permit <var> <level>`

Set permission level for a var.

```bash
ni-gate permit TELEGRAM_BOT_TOKEN always
ni-gate permit STRIPE_SECRET_KEY ask
```

### `ni-gate revoke <var>`

Set permission to `deny`.

```bash
ni-gate revoke STRIPE_SECRET_KEY
```

### `ni-gate status`

Show current permission rules.

```
$ ni-gate status
Rules:
  TELEGRAM_BOT_TOKEN       always
  TELEGRAM_BOT_TOKEN_KIRA  deny
  LINEAR_API_KEY           always
  GITHUB_TOKEN             always
  STRIPE_SECRET_KEY        ask
```

## Approval Prompt UX

### Single var request

```
🔑 ni-gate: secret requested
   var:     TELEGRAM_BOT_TOKEN
   command: curl https://api.telegram.org/bot/sendMessage -d '...'

   [A]lways / [O]nce / [D]eny? _
```

### Multiple vars request

```
🔑 ni-gate: secrets requested
   vars:    TELEGRAM_BOT_TOKEN      [no rule]
            TELEGRAM_BOT_TOKEN_KIRA [no rule]
   command: bash -c 'curl ...'

   Approve all? [A]lways / [O]nce / [D]eny / [P]ick? _
```

Choosing `[P]ick` prompts per-var:

```
   TELEGRAM_BOT_TOKEN      — [A]lways / [O]nce / [D]eny? a
   TELEGRAM_BOT_TOKEN_KIRA — [A]lways / [O]nce / [D]eny? d
```

## Permission Levels

| Level    | Behavior                           | Persisted          |
| -------- | ---------------------------------- | ------------------ |
| `always` | Never prompt again                 | Yes, in rules.yaml |
| `once`   | Approve this single execution only | Not persisted      |
| `ask`    | Prompt every time                  | Yes, in rules.yaml |
| `deny`   | Always block                       | Yes, in rules.yaml |

## Configuration

### `~/.ni-gate/rules.yaml`

```yaml
# Secret backend configuration
backend:
  type: infisical  # infisical | dotenv | 1password | vault
  # Backend-specific options:
  # infisical:
  #   project_id: "ac5aae48-..."
  #   env: prod
  # dotenv:
  #   path: "/path/to/.env"
  # 1password:
  #   vault: "Development"
  # vault:
  #   addr: "https://vault.example.com"
  #   path: "secret/data/agents"
  infisical:
    project_id: "ac5aae48-72b2-485f-82fb-a3c56451b279"
    env: prod

# Per-var permissions (auto-generated from approvals)
# Simple form — just permission level, no restrictions:
#   VAR_NAME: always
#
# Extended form — with access rules:
#   VAR_NAME:
#     permission: always
#     allow_commands: [curl, wget]        # optional — which CLI binaries can use this var
#     allow_urls: ["api.example.com/*"]   # optional — which URL patterns can receive this var

vars:
  TELEGRAM_BOT_TOKEN:
    permission: always
    allow_commands: [curl]
    allow_urls: ["api.telegram.org/*"]

  TELEGRAM_BOT_TOKEN_KIRA: deny

  LINEAR_API_KEY:
    permission: always
    allow_commands: [curl]
    allow_urls: ["api.linear.app/*"]

  STRIPE_SECRET_KEY:
    permission: ask
    allow_commands: [curl]
    allow_urls: ["api.stripe.com/*"]

  GITHUB_TOKEN: always  # no restrictions — used by gh, curl, git, etc.
```

### `ni-gate refresh`

Re-scan the backend and rebuild the local var name cache.

```bash
ni-gate refresh
```

### Non-interactive mode

If no TTY is available (piped stdin, background process), ni-gate operates in strict mode:

- Vars with `always` permission → auto-approve
- All other vars → **denied with exit code 11** and stderr message explaining why
- No prompts are attempted — ni-gate never hangs waiting for input

## Secret Backends

ni-gate uses a pluggable backend interface. Each backend implements two operations:

```typescript
interface SecretBackend {
  list(): Promise<string[]>        // return var names (never values)
  get(name: string): Promise<string> // return var value
}
```

### Supported backends

**`infisical`** — Infisical CLI (default, v1)
- `list()` → `infisical secrets list --projectId ... --env prod` (names only)
- `get(VAR)` → `infisical secrets get VAR --plain`
- Auth: machine identity in `~/.ni-gate/auth.yaml`

**`dotenv`** — plain .env file
- `list()` → parse file, return key names
- `get(VAR)` → parse file, return value
- Simplest backend — good for getting started

**`1password`** — 1Password CLI (future)
- `list()` → `op item list --vault X --format json`
- `get(VAR)` → `op read "op://vault/item/field"`

**`vault`** — HashiCorp Vault (future)
- `list()` → `vault kv list secret/agents`
- `get(VAR)` → `vault kv get -field=VAR secret/agents`

### Bootstrapping

On first `ni-gate list`, ni-gate queries the backend and caches var names locally:

```yaml
# ~/.ni-gate/cache.yaml (auto-generated, not sensitive — names only)
vars: [TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_TOKEN_KIRA, LINEAR_API_KEY, GITHUB_TOKEN, ...]
updated_at: "2026-03-19T10:00:00Z"
```

Cache refreshed on `ni-gate list` or `ni-gate refresh`.

## Agent Integration

### CLAUDE.md instruction

```markdown
## Secrets

- Never use `loadvars`. Never read secrets from env or files.
- Use `ni-gate` to access secrets:
  - `ni-gate list` — see available secret names
  - `ni-gate run <VAR> -- <command>` — run command with secret injected
  - Request only the vars you need.
```

### Example agent workflow

```
Agent: I need to send a Telegram message. Let me check what's available.
> ni-gate list
TELEGRAM_BOT_TOKEN       [always]
TELEGRAM_BOT_TOKEN_KIRA  [deny]
LINEAR_API_KEY           [always]
...

Agent: I'll use TELEGRAM_BOT_TOKEN.
> ni-gate run TELEGRAM_BOT_TOKEN -- bash -c 'curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" -d "{\"chat_id\":123,\"text\":\"hello\"}"'

# If permission is "always" → runs immediately, no prompt.
# If first request (no rule) → user sees:

🔑 ni-gate: secret requested
   var:     TELEGRAM_BOT_TOKEN
   command: bash -c 'curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" ...'
   [A]lways / [O]nce / [D]eny? a

User presses 'a' → rule saved to rules.yaml as "always". Command runs.
Next time agent requests TELEGRAM_BOT_TOKEN → auto-approved, no prompt.
```

## Tech Stack

- **Language:** TypeScript
- **Runtime:** Bun
- **Secret backend:** pluggable (Infisical + dotenv in v1)
- **Config format:** YAML
- **Dependencies:** minimal — yaml parser, readline for prompts

## Scope of v1

### In scope

- `run`, `list`, `permit`, `revoke`, `status`, `refresh` commands
- Interactive approval prompt with 4 permission levels (always/once/ask/deny)
- Per-var permission persistence in rules.yaml
- Per-var access rules: `allow_commands` and `allow_urls` (optional, progressive hardening)
- Pluggable secret backend (Infisical + dotenv in v1)
- Var name discovery and caching

### Out of scope (future versions)

- **v2:** Per-endpoint HTTP method ACLs (GET vs POST)
- **v2:** MCP tool interface
- **v3:** Response sanitization (strip secret values from command output)
- **v3:** Audit log (who requested what, when, approved/denied)
- **v2:** Additional backends (1Password, HashiCorp Vault)
- **v3:** Claude Code PreToolUse hook for automatic interception

## Security Model

**What ni-gate protects against:**

- Agent exfiltrating secrets via prompt injection (secrets never in agent memory)
- Agent using secrets for unintended purposes (user approves each use)
- Blast radius of compromise (only approved vars exposed, only for one command)

**What ni-gate does NOT protect against (v1):**

- Agent reading secret values from command output (response sanitization is v3)
- Agent bypassing ni-gate to access the backend directly (mitigated if agent doesn't have backend credentials — see below)
- Malicious command that exfiltrates injected env vars (e.g., `env | curl ...`) — mitigated by `allow_commands` rules and user reviewing the command in approval prompt

**Mitigation for direct backend access:**

- ni-gate should be the only thing with backend credentials
- Agent's env should NOT have any backend auth tokens (e.g., `INFISICAL_TOKEN`, `OP_SESSION_*`, `VAULT_TOKEN`)
- Backend credentials are stored in `~/.ni-gate/auth.yaml` (file permissions 0600, owned by user)
- ni-gate reads this file directly — credentials never enter the agent's env or shell history

```yaml
# ~/.ni-gate/auth.yaml (permissions: 0600)
# Backend-specific authentication
# Only the active backend's credentials need to be present

# Example: Infisical
infisical:
  auth_method: universal  # universal | token | kubernetes
  client_id: "..."
  client_secret: "..."

# Example: dotenv (no auth needed, just file path in rules.yaml)

# Example: 1Password (future)
# 1password:
#   service_account_token: "..."
```

## Error Handling

**Three primary failure modes the agent must distinguish:**

1. **NOT_FOUND (exit 10)** — var does not exist. Agent should check `ni-gate list` and use a correct name.
2. **ACCESS_DENIED (exit 11)** — var exists but permission is denied. Agent should not retry — user must change permission.
3. **RULE_VIOLATION (exit 12)** — var is approved but the command or URL is not allowed. Agent must use a different command/URL or ask user to update access rules.

Full error table:

| Scenario | Exit code | Stderr message |
|----------|-----------|----------------|
| Var does not exist | 10 | `ni-gate: NOT_FOUND — var "X" does not exist. Run "ni-gate list" to see available vars.` |
| Var denied by permission | 11 | `ni-gate: ACCESS_DENIED — var "X" exists but access denied. Ask user to run: ni-gate permit X <level>` |
| Var denied by user prompt | 11 | `ni-gate: ACCESS_DENIED — var "X" denied by user.` |
| No TTY + var needs prompt | 11 | `ni-gate: ACCESS_DENIED — var "X" requires approval but no TTY. Ask user to run: ni-gate permit X always` |
| Command not allowed | 12 | `ni-gate: RULE_VIOLATION — var "X" not allowed with command "python". Allowed: [curl]. Ask user to update rules.yaml` |
| URL not allowed | 12 | `ni-gate: RULE_VIOLATION — var "X" not allowed for URL "evil.com". Allowed: ["api.telegram.org/*"]. Ask user to update rules.yaml` |
| Backend unreachable | 3 | `ni-gate: BACKEND_ERROR — cannot connect to backend: <error>` |
| Backend auth failed | 3 | `ni-gate: BACKEND_ERROR — backend authentication failed. Check ~/.ni-gate/auth.yaml` |
| Invalid command syntax | 4 | `ni-gate: usage: ni-gate run <vars> -- <command>` |
| Subprocess failed | N | Passes through the subprocess exit code |
