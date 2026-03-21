import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import yaml from "js-yaml";

export type PermissionLevel = "always" | "once" | "ask" | "deny";

export interface VarRule {
  permission: PermissionLevel;
  allow_commands?: string[];
  allow_urls?: string[];
}

export type VarConfig = PermissionLevel | VarRule;

export interface BackendConfig {
  type: string;
  [key: string]: unknown;
}

export interface Rules {
  backend: BackendConfig;
  vars: Record<string, VarConfig>;
}

const DEFAULT_RULES: Rules = {
  backend: { type: "dotenv" },
  vars: {},
};

const DEFAULT_CONFIG_DIR = join(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".ni-gate"
);

export const DEFAULT_RULES_PATH = join(DEFAULT_CONFIG_DIR, "rules.yaml");

export function loadRules(path: string = DEFAULT_RULES_PATH): Rules {
  if (!existsSync(path)) {
    return structuredClone(DEFAULT_RULES);
  }
  const content = readFileSync(path, "utf-8");
  const parsed = yaml.load(content) as Partial<Rules> | null;
  return {
    backend: parsed?.backend ?? { type: "dotenv" },
    vars: parsed?.vars ?? {},
  };
}

export function saveRules(path: string = DEFAULT_RULES_PATH, rules: Rules): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const content = yaml.dump(rules, { lineWidth: -1, quotingType: '"' });
  writeFileSync(path, content, "utf-8");
}

export function getVarPermission(rules: Rules, varName: string): PermissionLevel | null {
  const config = rules.vars[varName];
  if (config === undefined) return null;
  if (typeof config === "string") return config;
  return config.permission;
}

export function getVarRule(rules: Rules, varName: string): VarRule | null {
  const config = rules.vars[varName];
  if (config === undefined) return null;
  if (typeof config === "string") return { permission: config };
  return config;
}

export function setVarPermission(rules: Rules, varName: string, level: PermissionLevel): void {
  const existing = rules.vars[varName];
  if (existing !== undefined && typeof existing === "object") {
    existing.permission = level;
  } else {
    rules.vars[varName] = level;
  }
}

export function setVarRule(rules: Rules, varName: string, rule: VarRule): void {
  rules.vars[varName] = rule;
}
