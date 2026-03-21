import { SecretNotFoundError, type SecretBackend } from "./interface";

interface InfisicalSecret {
  secretKey: string;
  [key: string]: unknown;
}

export function parseInfisicalJsonOutput(stdout: string): string[] {
  const secrets: InfisicalSecret[] = JSON.parse(stdout);
  return secrets.map(s => s.secretKey).filter(Boolean);
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
      ["infisical", "secrets", "--projectId", this.projectId, "--env", this.env, "-o", "json"],
      { stdout: "pipe", stderr: "pipe" }
    );
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`infisical secrets failed (exit ${exitCode}): ${stderr}`);
    }
    const stdout = await new Response(proc.stdout).text();
    return parseInfisicalJsonOutput(stdout);
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
