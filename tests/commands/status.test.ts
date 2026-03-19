import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { runStatus } from "../../src/commands/status";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const TEST_DIR = join(import.meta.dir, ".test-status");
const RULES_PATH = join(TEST_DIR, "rules.yaml");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(RULES_PATH, `backend:\n  type: dotenv\nvars:\n  TOKEN_A: always\n  TOKEN_B: deny\n  TOKEN_C:\n    permission: ask\n    allow_commands: [curl]\n`);
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("runStatus", () => {
  test("shows all rules", async () => {
    const lines: string[] = [];
    await runStatus({ rulesPath: RULES_PATH, output: (l) => lines.push(l) });
    const output = lines.join("\n");
    expect(output).toContain("TOKEN_A");
    expect(output).toContain("always");
    expect(output).toContain("TOKEN_B");
    expect(output).toContain("deny");
    expect(output).toContain("TOKEN_C");
    expect(output).toContain("ask");
  });
});
