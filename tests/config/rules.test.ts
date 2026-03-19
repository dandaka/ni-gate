import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { loadRules, saveRules, getVarPermission, setVarPermission, type Rules, type VarRule } from "../../src/config/rules";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const TEST_DIR = join(import.meta.dir, ".test-ni-gate");
const RULES_PATH = join(TEST_DIR, "rules.yaml");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("loadRules", () => {
  test("returns default rules when file does not exist", () => {
    const rules = loadRules(RULES_PATH);
    expect(rules.backend).toEqual({ type: "dotenv" });
    expect(rules.vars).toEqual({});
  });

  test("loads rules from yaml file", () => {
    writeFileSync(RULES_PATH, `
backend:
  type: infisical
  infisical:
    project_id: "abc123"
    env: prod
vars:
  MY_TOKEN: always
  MY_SECRET:
    permission: ask
    allow_commands: [curl]
    allow_urls: ["api.example.com/*"]
`);
    const rules = loadRules(RULES_PATH);
    expect(rules.backend.type).toBe("infisical");
    expect(rules.vars.MY_TOKEN).toBe("always");
    expect((rules.vars.MY_SECRET as VarRule).permission).toBe("ask");
    expect((rules.vars.MY_SECRET as VarRule).allow_commands).toEqual(["curl"]);
  });
});

describe("getVarPermission", () => {
  test("returns permission from simple string rule", () => {
    const rules: Rules = { backend: { type: "dotenv" }, vars: { TOKEN: "always" } };
    expect(getVarPermission(rules, "TOKEN")).toBe("always");
  });

  test("returns permission from extended rule", () => {
    const rules: Rules = {
      backend: { type: "dotenv" },
      vars: { TOKEN: { permission: "ask", allow_commands: ["curl"] } },
    };
    expect(getVarPermission(rules, "TOKEN")).toBe("ask");
  });

  test("returns null for unknown var", () => {
    const rules: Rules = { backend: { type: "dotenv" }, vars: {} };
    expect(getVarPermission(rules, "UNKNOWN")).toBeNull();
  });
});

describe("setVarPermission", () => {
  test("sets simple permission", () => {
    const rules: Rules = { backend: { type: "dotenv" }, vars: {} };
    setVarPermission(rules, "TOKEN", "always");
    expect(rules.vars.TOKEN).toBe("always");
  });

  test("preserves extended rule fields when updating permission", () => {
    const rules: Rules = {
      backend: { type: "dotenv" },
      vars: { TOKEN: { permission: "ask", allow_commands: ["curl"], allow_urls: ["api.example.com/*"] } },
    };
    setVarPermission(rules, "TOKEN", "always");
    expect((rules.vars.TOKEN as VarRule).permission).toBe("always");
    expect((rules.vars.TOKEN as VarRule).allow_commands).toEqual(["curl"]);
  });
});

describe("saveRules", () => {
  test("saves and reloads rules", () => {
    const rules: Rules = {
      backend: { type: "dotenv" },
      vars: { TOKEN: "always", SECRET: { permission: "ask", allow_commands: ["curl"] } },
    };
    saveRules(RULES_PATH, rules);
    const loaded = loadRules(RULES_PATH);
    expect(loaded.vars.TOKEN).toBe("always");
    expect((loaded.vars.SECRET as VarRule).permission).toBe("ask");
  });
});
