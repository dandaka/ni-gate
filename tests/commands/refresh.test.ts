import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { runRefresh } from "../../src/commands/refresh";
import { loadCache } from "../../src/config/cache";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const TEST_DIR = join(import.meta.dir, ".test-refresh");
const ENV_PATH = join(TEST_DIR, ".env");
const RULES_PATH = join(TEST_DIR, "rules.yaml");
const CACHE_PATH = join(TEST_DIR, "cache.yaml");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(ENV_PATH, "VAR_A=a\nVAR_B=b\n");
  writeFileSync(RULES_PATH, `backend:\n  type: dotenv\n  dotenv:\n    path: "${ENV_PATH}"\nvars: {}\n`);
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("runRefresh", () => {
  test("rebuilds cache from backend", async () => {
    await runRefresh({ rulesPath: RULES_PATH, cachePath: CACHE_PATH });
    const cache = loadCache(CACHE_PATH);
    expect(cache.vars).toContain("VAR_A");
    expect(cache.vars).toContain("VAR_B");
    expect(cache.updated_at).toBeTruthy();
  });
});
