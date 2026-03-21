import { describe, test, expect } from "bun:test";
import { InfisicalBackend, parseInfisicalJsonOutput } from "../../src/backends/infisical";

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

describe("parseInfisicalJsonOutput", () => {
  test("parses JSON output", () => {
    const output = JSON.stringify([
      { secretKey: "TELEGRAM_BOT_TOKEN", secretValue: "***" },
      { secretKey: "LINEAR_API_KEY", secretValue: "***" },
      { secretKey: "GITHUB_TOKEN", secretValue: "***" },
    ]);
    const names = parseInfisicalJsonOutput(output);
    expect(names).toEqual(["TELEGRAM_BOT_TOKEN", "LINEAR_API_KEY", "GITHUB_TOKEN"]);
  });

  test("returns empty for empty array", () => {
    expect(parseInfisicalJsonOutput("[]")).toEqual([]);
  });
});
