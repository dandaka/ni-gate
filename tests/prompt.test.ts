import { describe, test, expect } from "bun:test";
import { hasTTY, formatPromptSingle, formatPromptMultiple, type PromptResult } from "../src/prompt";

describe("formatPromptSingle", () => {
  test("formats single var prompt", () => {
    const output = formatPromptSingle("TELEGRAM_BOT_TOKEN", "curl https://api.telegram.org/...");
    expect(output).toContain("TELEGRAM_BOT_TOKEN");
    expect(output).toContain("curl");
    expect(output).toContain("[A]lways");
    expect(output).toContain("[O]nce");
    expect(output).toContain("[D]eny");
  });
});

describe("formatPromptMultiple", () => {
  test("formats multiple vars prompt", () => {
    const vars = [
      { name: "TOKEN_A", currentRule: "no rule" },
      { name: "TOKEN_B", currentRule: "always" },
    ];
    const output = formatPromptMultiple(vars, "bash -c 'curl ...'");
    expect(output).toContain("TOKEN_A");
    expect(output).toContain("TOKEN_B");
    expect(output).toContain("[P]ick");
  });
});

describe("hasTTY", () => {
  test("returns boolean", () => {
    const result = hasTTY();
    expect(typeof result).toBe("boolean");
  });
});
