import { type SecretBackend } from "./interface";

export class InfisicalBackend implements SecretBackend {
  constructor(private projectId: string, private env: string) {}
  async list(): Promise<string[]> { throw new Error("Infisical backend not yet implemented"); }
  async get(name: string): Promise<string> { throw new Error("Infisical backend not yet implemented"); }
}
