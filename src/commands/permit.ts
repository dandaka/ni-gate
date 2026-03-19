import { loadRules, saveRules, setVarPermission, type PermissionLevel } from "../config/rules";

const VALID_LEVELS: PermissionLevel[] = ["always", "ask", "deny"];

interface PermitOptions {
  rulesPath?: string;
}

export async function runPermit(varName: string, level: string, opts: PermitOptions = {}): Promise<void> {
  if (!VALID_LEVELS.includes(level as PermissionLevel)) {
    throw new Error(`Invalid level "${level}". Valid: ${VALID_LEVELS.join(", ")}`);
  }
  const rules = loadRules(opts.rulesPath);
  setVarPermission(rules, varName, level as PermissionLevel);
  saveRules(opts.rulesPath, rules);
  console.error(`ni-gate: ${varName} set to ${level}`);
}
