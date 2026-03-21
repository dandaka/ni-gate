import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { runPermit, parsePermitFlags } from "../../src/commands/permit";
import { loadRules } from "../../src/config/rules";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const TEST_DIR = join(import.meta.dir, ".test-permit");
const RULES_PATH = join(TEST_DIR, "rules.yaml");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(RULES_PATH, `backend:\n  type: dotenv\nvars:\n  TOKEN_A: deny\n`);
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("parsePermitFlags", () => {
  test("parses --commands", () => {
    const flags = parsePermitFlags(["--commands", "curl,wget"]);
    expect(flags.commands).toEqual(["curl", "wget"]);
  });

  test("parses --urls", () => {
    const flags = parsePermitFlags(["--urls", "api.example.com/*,cdn.example.com/*"]);
    expect(flags.urls).toEqual(["api.example.com/*", "cdn.example.com/*"]);
  });

  test("parses --force", () => {
    const flags = parsePermitFlags(["--force"]);
    expect(flags.force).toBe(true);
  });

  test("parses --commands and --urls together", () => {
    const flags = parsePermitFlags(["--commands", "curl", "--urls", "api.example.com/*"]);
    expect(flags.commands).toEqual(["curl"]);
    expect(flags.urls).toEqual(["api.example.com/*"]);
  });

  test("returns empty for no flags", () => {
    const flags = parsePermitFlags([]);
    expect(flags.commands).toBeUndefined();
    expect(flags.urls).toBeUndefined();
    expect(flags.force).toBeUndefined();
  });
});

describe("runPermit", () => {
  test("without scope shows help and returns 4", async () => {
    const code = await runPermit("TOKEN_A", "always", {}, { rulesPath: RULES_PATH });
    expect(code).toBe(4);
    const rules = loadRules(RULES_PATH);
    expect(rules.vars.TOKEN_A).toBe("deny"); // unchanged
  });

  test("with --commands saves scoped rule", async () => {
    const code = await runPermit("TOKEN_A", "always", { commands: ["curl", "wget"] }, { rulesPath: RULES_PATH });
    expect(code).toBe(0);
    const rules = loadRules(RULES_PATH);
    expect(rules.vars.TOKEN_A).toEqual({
      permission: "always",
      allow_commands: ["curl", "wget"],
    });
  });

  test("with --urls saves scoped rule", async () => {
    const code = await runPermit("TOKEN_A", "always", { urls: ["api.example.com/*"] }, { rulesPath: RULES_PATH });
    expect(code).toBe(0);
    const rules = loadRules(RULES_PATH);
    expect(rules.vars.TOKEN_A).toEqual({
      permission: "always",
      allow_urls: ["api.example.com/*"],
    });
  });

  test("with --commands and --urls saves both", async () => {
    const code = await runPermit("TOKEN_A", "always", { commands: ["curl"], urls: ["api.example.com/*"] }, { rulesPath: RULES_PATH });
    expect(code).toBe(0);
    const rules = loadRules(RULES_PATH);
    expect(rules.vars.TOKEN_A).toEqual({
      permission: "always",
      allow_commands: ["curl"],
      allow_urls: ["api.example.com/*"],
    });
  });

  test("with --force saves bare permission with warning", async () => {
    const code = await runPermit("TOKEN_A", "always", { force: true }, { rulesPath: RULES_PATH });
    expect(code).toBe(0);
    const rules = loadRules(RULES_PATH);
    expect(rules.vars.TOKEN_A).toBe("always");
  });

  test("rejects invalid level", async () => {
    const code = await runPermit("TOKEN_A", "invalid", { force: true }, { rulesPath: RULES_PATH });
    expect(code).toBe(4);
  });

  test("adds new var with scope", async () => {
    const code = await runPermit("NEW_VAR", "ask", { commands: ["replicate"] }, { rulesPath: RULES_PATH });
    expect(code).toBe(0);
    const rules = loadRules(RULES_PATH);
    expect(rules.vars.NEW_VAR).toEqual({
      permission: "ask",
      allow_commands: ["replicate"],
    });
  });
});
