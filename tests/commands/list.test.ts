import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { runList } from "../../src/commands/list";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const TEST_DIR = join(import.meta.dir, ".test-list");
const ENV_PATH = join(TEST_DIR, ".env");
const RULES_PATH = join(TEST_DIR, "rules.yaml");
const CACHE_PATH = join(TEST_DIR, "cache.yaml");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(ENV_PATH, "TOKEN_A=val_a\nTOKEN_B=val_b\nSECRET_C=val_c\n");
  writeFileSync(RULES_PATH, `
backend:
  type: dotenv
  dotenv:
    path: "${ENV_PATH}"
vars:
  TOKEN_A: always
  TOKEN_B: deny
`);
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("runList", () => {
  test("lists vars with permission levels", async () => {
    const lines: string[] = [];
    await runList({
      rulesPath: RULES_PATH,
      cachePath: CACHE_PATH,
      output: (line: string) => lines.push(line),
    });
    const output = lines.join("\n");
    expect(output).toContain("TOKEN_A");
    expect(output).toContain("always");
    expect(output).toContain("TOKEN_B");
    expect(output).toContain("deny");
    expect(output).toContain("SECRET_C");
    expect(output).toContain("no rule");
  });
});
