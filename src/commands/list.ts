import { loadRules, getVarPermission } from "../config/rules";
import { loadCache, saveCache } from "../config/cache";
import { createBackend } from "../backends/factory";

interface ListOptions {
  rulesPath?: string;
  cachePath?: string;
  output?: (line: string) => void;
}

export async function runList(opts: ListOptions = {}): Promise<void> {
  const print = opts.output ?? console.log;
  const rules = loadRules(opts.rulesPath);
  const backend = createBackend(rules.backend);

  const varNames = await backend.list();

  saveCache(opts.cachePath, {
    vars: varNames,
    updated_at: new Date().toISOString(),
  });

  for (const name of varNames.sort()) {
    const perm = getVarPermission(rules, name);
    const permStr = perm ?? "no rule";
    print(`${name.padEnd(30)} [${permStr}]`);
  }
}
