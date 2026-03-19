import { loadRules, getVarPermission } from "../config/rules";

interface StatusOptions {
  rulesPath?: string;
  output?: (line: string) => void;
}

export async function runStatus(opts: StatusOptions = {}): Promise<void> {
  const print = opts.output ?? console.log;
  const rules = loadRules(opts.rulesPath);

  print("Rules:");
  const varNames = Object.keys(rules.vars).sort();
  if (varNames.length === 0) {
    print("  (no rules configured)");
    return;
  }
  for (const name of varNames) {
    const perm = getVarPermission(rules, name);
    print(`  ${name.padEnd(30)} ${perm}`);
  }
}
