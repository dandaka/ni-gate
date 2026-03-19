import type { SecretBackend } from "./interface";
import type { BackendConfig } from "../config/rules";
import { DotenvBackend } from "./dotenv";
import { InfisicalBackend } from "./infisical";

export function createBackend(config: BackendConfig): SecretBackend {
  switch (config.type) {
    case "dotenv": {
      const path = (config.dotenv as { path?: string })?.path ?? ".env";
      return new DotenvBackend(path);
    }
    case "infisical": {
      const inf = config.infisical as { project_id: string; env: string } | undefined;
      if (!inf) throw new Error("Missing infisical config in rules.yaml");
      return new InfisicalBackend(inf.project_id, inf.env);
    }
    default:
      throw new Error(`Unknown backend type: "${config.type}". Supported: dotenv, infisical`);
  }
}
