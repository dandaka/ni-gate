import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { runRevoke } from "../../src/commands/revoke";
import { loadRules } from "../../src/config/rules";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const TEST_DIR = join(import.meta.dir, ".test-revoke");
const RULES_PATH = join(TEST_DIR, "rules.yaml");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(RULES_PATH, `backend:\n  type: dotenv\nvars:\n  TOKEN_A: always\n`);
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("runRevoke", () => {
  test("sets permission to deny", async () => {
    await runRevoke("TOKEN_A", { rulesPath: RULES_PATH });
    const rules = loadRules(RULES_PATH);
    expect(rules.vars.TOKEN_A).toBe("deny");
  });
});
