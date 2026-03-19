import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { runPermit } from "../../src/commands/permit";
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

describe("runPermit", () => {
  test("sets permission level", async () => {
    await runPermit("TOKEN_A", "always", { rulesPath: RULES_PATH });
    const rules = loadRules(RULES_PATH);
    expect(rules.vars.TOKEN_A).toBe("always");
  });

  test("adds new var rule", async () => {
    await runPermit("NEW_VAR", "ask", { rulesPath: RULES_PATH });
    const rules = loadRules(RULES_PATH);
    expect(rules.vars.NEW_VAR).toBe("ask");
  });

  test("rejects invalid level", async () => {
    expect(runPermit("TOKEN_A", "invalid" as any, { rulesPath: RULES_PATH })).rejects.toThrow();
  });
});
