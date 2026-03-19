import { readFileSync } from "fs";
import { SecretNotFoundError, type SecretBackend } from "./interface";

export class DotenvBackend implements SecretBackend {
  private path: string;

  constructor(path: string) {
    this.path = path;
  }

  private parse(): Map<string, string> {
    const content = readFileSync(this.path, "utf-8");
    const entries = new Map<string, string>();
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      entries.set(key, value);
    }
    return entries;
  }

  async list(): Promise<string[]> {
    return Array.from(this.parse().keys());
  }

  async get(name: string): Promise<string> {
    const entries = this.parse();
    if (!entries.has(name)) {
      throw new SecretNotFoundError(name);
    }
    return entries.get(name)!;
  }
}
