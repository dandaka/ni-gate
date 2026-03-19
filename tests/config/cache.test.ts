import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { loadCache, saveCache, type VarCache } from "../../src/config/cache";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const TEST_DIR = join(import.meta.dir, ".test-ni-gate-cache");
const CACHE_PATH = join(TEST_DIR, "cache.yaml");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("loadCache", () => {
  test("returns empty cache when file does not exist", () => {
    const cache = loadCache(CACHE_PATH);
    expect(cache.vars).toEqual([]);
    expect(cache.updated_at).toBe("");
  });

  test("loads cache from yaml file", () => {
    writeFileSync(CACHE_PATH, `
vars: [TOKEN_A, TOKEN_B, SECRET_C]
updated_at: "2026-03-19T10:00:00Z"
`);
    const cache = loadCache(CACHE_PATH);
    expect(cache.vars).toEqual(["TOKEN_A", "TOKEN_B", "SECRET_C"]);
    expect(cache.updated_at).toBe("2026-03-19T10:00:00Z");
  });
});

describe("saveCache", () => {
  test("saves and reloads cache", () => {
    const cache: VarCache = {
      vars: ["A", "B"],
      updated_at: "2026-03-19T12:00:00Z",
    };
    saveCache(CACHE_PATH, cache);
    const loaded = loadCache(CACHE_PATH);
    expect(loaded.vars).toEqual(["A", "B"]);
    expect(loaded.updated_at).toBe("2026-03-19T12:00:00Z");
  });
});
