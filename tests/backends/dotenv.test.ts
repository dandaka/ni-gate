import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { DotenvBackend } from "../../src/backends/dotenv";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const TEST_DIR = join(import.meta.dir, ".test-dotenv");
const ENV_PATH = join(TEST_DIR, ".env");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(ENV_PATH, `
# comment line
TOKEN_A=value_a
TOKEN_B=value_b
SECRET_C="quoted value"
EMPTY_VAR=
SPACED_VAR=  hello world
`);
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("DotenvBackend", () => {
  test("list returns all var names", async () => {
    const backend = new DotenvBackend(ENV_PATH);
    const vars = await backend.list();
    expect(vars).toContain("TOKEN_A");
    expect(vars).toContain("TOKEN_B");
    expect(vars).toContain("SECRET_C");
    expect(vars).toContain("EMPTY_VAR");
    expect(vars).toContain("SPACED_VAR");
    expect(vars).not.toContain("# comment line");
  });

  test("get returns var value", async () => {
    const backend = new DotenvBackend(ENV_PATH);
    expect(await backend.get("TOKEN_A")).toBe("value_a");
  });

  test("get returns quoted value without quotes", async () => {
    const backend = new DotenvBackend(ENV_PATH);
    expect(await backend.get("SECRET_C")).toBe("quoted value");
  });

  test("get returns trimmed value", async () => {
    const backend = new DotenvBackend(ENV_PATH);
    expect(await backend.get("SPACED_VAR")).toBe("hello world");
  });

  test("get throws for missing var", async () => {
    const backend = new DotenvBackend(ENV_PATH);
    expect(backend.get("NONEXISTENT")).rejects.toThrow();
  });

  test("get returns empty string for empty var", async () => {
    const backend = new DotenvBackend(ENV_PATH);
    expect(await backend.get("EMPTY_VAR")).toBe("");
  });
});
