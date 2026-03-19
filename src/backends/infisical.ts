import { SecretNotFoundError, type SecretBackend } from "./interface";

export function parseInfisicalListOutput(stdout: string): string[] {
  const names: string[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("┌") || trimmed.startsWith("├") ||
        trimmed.startsWith("└") || trimmed.startsWith("│ SECRET")) continue;
    if (trimmed.startsWith("│")) {
      const cols = trimmed.split("│").map(c => c.trim()).filter(Boolean);
      if (cols.length > 0 && cols[0] && !cols[0].includes(" ")) {
        names.push(cols[0]);
      }
    }
  }
  return names;
}

export class InfisicalBackend implements SecretBackend {
  private projectId: string;
  private env: string;

  constructor(projectId: string, env: string) {
    this.projectId = projectId;
    this.env = env;
  }

  async list(): Promise<string[]> {
    const proc = Bun.spawn(
      ["infisical", "secrets", "list", "--projectId", this.projectId, "--env", this.env],
      { stdout: "pipe", stderr: "pipe" }
    );
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`infisical secrets list failed (exit ${exitCode}): ${stderr}`);
    }
    const stdout = await new Response(proc.stdout).text();
    return parseInfisicalListOutput(stdout);
  }

  async get(name: string): Promise<string> {
    const proc = Bun.spawn(
      ["infisical", "secrets", "get", name, "--projectId", this.projectId, "--env", this.env, "--plain"],
      { stdout: "pipe", stderr: "pipe" }
    );
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      if (stderr.includes("not found") || stderr.includes("could not find")) {
        throw new SecretNotFoundError(name);
      }
      throw new Error(`infisical secrets get failed (exit ${exitCode}): ${stderr}`);
    }
    const stdout = await new Response(proc.stdout).text();
    return stdout.trim();
  }
}
