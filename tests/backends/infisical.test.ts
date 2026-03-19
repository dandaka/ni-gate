import { describe, test, expect } from "bun:test";
import { InfisicalBackend, parseInfisicalListOutput } from "../../src/backends/infisical";

describe("InfisicalBackend", () => {
  test("implements SecretBackend interface", () => {
    const backend = new InfisicalBackend("proj123", "prod");
    expect(backend).toHaveProperty("list");
    expect(backend).toHaveProperty("get");
  });

  test("constructs with project_id and env", () => {
    const backend = new InfisicalBackend("proj123", "dev");
    expect(backend).toBeDefined();
  });
});

describe("parseInfisicalListOutput", () => {
  test("parses table output", () => {
    const output = `
┌─────────────────────┬─────────────┐
│ SECRET NAME         │ SECRET VALUE│
├─────────────────────┼─────────────┤
│ TELEGRAM_BOT_TOKEN  │ ***         │
│ LINEAR_API_KEY      │ ***         │
│ GITHUB_TOKEN        │ ***         │
└─────────────────────┴─────────────┘
`;
    const names = parseInfisicalListOutput(output);
    expect(names).toEqual(["TELEGRAM_BOT_TOKEN", "LINEAR_API_KEY", "GITHUB_TOKEN"]);
  });

  test("returns empty for empty output", () => {
    expect(parseInfisicalListOutput("")).toEqual([]);
  });
});
