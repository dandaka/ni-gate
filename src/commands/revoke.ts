import { loadRules, saveRules, setVarPermission } from "../config/rules";

interface RevokeOptions {
  rulesPath?: string;
}

export async function runRevoke(varName: string, opts: RevokeOptions = {}): Promise<void> {
  const rules = loadRules(opts.rulesPath);
  setVarPermission(rules, varName, "deny");
  saveRules(opts.rulesPath, rules);
  console.error(`ni-gate: ${varName} revoked (set to deny)`);
}
