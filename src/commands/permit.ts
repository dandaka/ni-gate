import { loadRules, saveRules, setVarPermission, setVarRule, type PermissionLevel, type VarRule } from "../config/rules";

const VALID_LEVELS: PermissionLevel[] = ["always", "ask", "deny"];

const PERMIT_HELP = `ni-gate: permit requires scope. Usage:
  ni-gate permit <var> <level> --commands <cmd1,cmd2>
  ni-gate permit <var> <level> --urls <pattern1,pattern2>
  ni-gate permit <var> <level> --commands <cmd> --urls <pattern>
  ni-gate permit <var> <level> --force    (unrestricted, not recommended)

Levels: always, ask, deny`;

interface PermitOptions {
  rulesPath?: string;
}

export interface PermitFlags {
  commands?: string[];
  urls?: string[];
  force?: boolean;
}

export function parsePermitFlags(args: string[]): PermitFlags {
  const flags: PermitFlags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--commands" && i + 1 < args.length) {
      flags.commands = args[i + 1].split(",").map(s => s.trim()).filter(Boolean);
      i++;
    } else if (args[i] === "--urls" && i + 1 < args.length) {
      flags.urls = args[i + 1].split(",").map(s => s.trim()).filter(Boolean);
      i++;
    } else if (args[i] === "--force") {
      flags.force = true;
    }
  }
  return flags;
}

export async function runPermit(varName: string, level: string, flags: PermitFlags = {}, opts: PermitOptions = {}): Promise<number> {
  if (!VALID_LEVELS.includes(level as PermissionLevel)) {
    process.stderr.write(`ni-gate: invalid level "${level}". Valid: ${VALID_LEVELS.join(", ")}\n`);
    return 4;
  }

  const hasScope = flags.commands || flags.urls;

  if (!hasScope && !flags.force) {
    process.stderr.write(PERMIT_HELP + "\n");
    return 4;
  }

  const rules = loadRules(opts.rulesPath);

  if (flags.force) {
    process.stderr.write(`ni-gate: WARNING — unrestricted access granted. Not recommended. Use --commands or --urls to limit scope.\n`);
    setVarPermission(rules, varName, level as PermissionLevel);
  } else {
    const rule: VarRule = { permission: level as PermissionLevel };
    if (flags.commands) rule.allow_commands = flags.commands;
    if (flags.urls) rule.allow_urls = flags.urls;
    setVarRule(rules, varName, rule);
  }

  saveRules(opts.rulesPath, rules);

  const scope: string[] = [];
  if (flags.commands) scope.push(`commands: ${flags.commands.join(", ")}`);
  if (flags.urls) scope.push(`urls: ${flags.urls.join(", ")}`);
  const msg = scope.length > 0
    ? `ni-gate: ${varName} set to ${level} (${scope.join(", ")})`
    : `ni-gate: ${varName} set to ${level}`;
  process.stderr.write(msg + "\n");

  return 0;
}
