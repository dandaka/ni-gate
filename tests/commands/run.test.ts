import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { parseRunArgs, runRun } from "../../src/commands/run";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const TEST_DIR = join(import.meta.dir, ".test-run");
const ENV_PATH = join(TEST_DIR, ".env");
const RULES_PATH = join(TEST_DIR, "rules.yaml");
const CACHE_PATH = join(TEST_DIR, "cache.yaml");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(ENV_PATH, "TOKEN_A=secret_value_a\nTOKEN_B=secret_value_b\nDENIED_VAR=nope\n");
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("parseRunArgs", () => {
  test("parses single var and command", () => {
    const result = parseRunArgs(["TOKEN_A", "--", "echo", "hello"]);
    expect(result.varNames).toEqual(["TOKEN_A"]);
    expect(result.command).toEqual(["echo", "hello"]);
  });

  test("parses comma-separated vars", () => {
    const result = parseRunArgs(["TOKEN_A,TOKEN_B", "--", "curl", "https://api.example.com"]);
    expect(result.varNames).toEqual(["TOKEN_A", "TOKEN_B"]);
    expect(result.command).toEqual(["curl", "https://api.example.com"]);
  });

  test("throws on missing --", () => {
    expect(() => parseRunArgs(["TOKEN_A", "echo", "hello"])).toThrow();
  });

  test("throws on empty command", () => {
    expect(() => parseRunArgs(["TOKEN_A", "--"])).toThrow();
  });

  test("throws on empty vars", () => {
    expect(() => parseRunArgs(["--", "echo"])).toThrow();
  });
});

describe("runRun", () => {
  test("executes command with secret in env (always permission)", async () => {
    writeFileSync(RULES_PATH, `
backend:
  type: dotenv
  dotenv:
    path: "${ENV_PATH}"
vars:
  TOKEN_A: always
`);
    const exitCode = await runRun(["TOKEN_A", "--", "bash", "-c", "echo $TOKEN_A"], {
      rulesPath: RULES_PATH,
      cachePath: CACHE_PATH,
    });
    expect(exitCode).toBe(0);
  });

  test("denies access for denied var", async () => {
    writeFileSync(RULES_PATH, `
backend:
  type: dotenv
  dotenv:
    path: "${ENV_PATH}"
vars:
  DENIED_VAR: deny
`);
    const exitCode = await runRun(["DENIED_VAR", "--", "echo", "test"], {
      rulesPath: RULES_PATH,
      cachePath: CACHE_PATH,
    });
    expect(exitCode).toBe(11);
  });

  test("returns exit 10 for nonexistent var", async () => {
    writeFileSync(RULES_PATH, `
backend:
  type: dotenv
  dotenv:
    path: "${ENV_PATH}"
vars:
  NONEXISTENT: always
`);
    const exitCode = await runRun(["NONEXISTENT", "--", "echo", "test"], {
      rulesPath: RULES_PATH,
      cachePath: CACHE_PATH,
    });
    expect(exitCode).toBe(10);
  });

  test("returns exit 12 for command rule violation", async () => {
    writeFileSync(RULES_PATH, `
backend:
  type: dotenv
  dotenv:
    path: "${ENV_PATH}"
vars:
  TOKEN_A:
    permission: always
    allow_commands: [curl]
`);
    const exitCode = await runRun(["TOKEN_A", "--", "python", "script.py"], {
      rulesPath: RULES_PATH,
      cachePath: CACHE_PATH,
    });
    expect(exitCode).toBe(12);
  });

  test("passes subprocess exit code through", async () => {
    writeFileSync(RULES_PATH, `
backend:
  type: dotenv
  dotenv:
    path: "${ENV_PATH}"
vars:
  TOKEN_A: always
`);
    const exitCode = await runRun(["TOKEN_A", "--", "bash", "-c", "exit 42"], {
      rulesPath: RULES_PATH,
      cachePath: CACHE_PATH,
    });
    expect(exitCode).toBe(42);
  });
});
