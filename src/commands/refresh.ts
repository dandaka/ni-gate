import { loadRules } from "../config/rules";
import { saveCache } from "../config/cache";
import { createBackend } from "../backends/factory";

interface RefreshOptions {
  rulesPath?: string;
  cachePath?: string;
}

export async function runRefresh(opts: RefreshOptions = {}): Promise<void> {
  const rules = loadRules(opts.rulesPath);
  const backend = createBackend(rules.backend);
  const varNames = await backend.list();
  saveCache(opts.cachePath, {
    vars: varNames,
    updated_at: new Date().toISOString(),
  });
  console.error(`ni-gate: cache refreshed (${varNames.length} vars)`);
}
