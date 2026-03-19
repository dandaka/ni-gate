import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import yaml from "js-yaml";

export interface VarCache {
  vars: string[];
  updated_at: string;
}

const DEFAULT_CACHE: VarCache = { vars: [], updated_at: "" };

const DEFAULT_CONFIG_DIR = join(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".ni-gate"
);

export const DEFAULT_CACHE_PATH = join(DEFAULT_CONFIG_DIR, "cache.yaml");

export function loadCache(path: string = DEFAULT_CACHE_PATH): VarCache {
  if (!existsSync(path)) {
    return structuredClone(DEFAULT_CACHE);
  }
  const content = readFileSync(path, "utf-8");
  const parsed = yaml.load(content) as Partial<VarCache> | null;
  return {
    vars: parsed?.vars ?? [],
    updated_at: parsed?.updated_at ?? "",
  };
}

export function saveCache(path: string = DEFAULT_CACHE_PATH, cache: VarCache): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const content = yaml.dump(cache, { lineWidth: -1, quotingType: '"' });
  writeFileSync(path, content, "utf-8");
}
