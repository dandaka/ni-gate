export class SecretNotFoundError extends Error {
  constructor(name: string) {
    super(`Variable "${name}" not found`);
    this.name = "SecretNotFoundError";
  }
}

export interface SecretBackend {
  list(): Promise<string[]>;
  get(name: string): Promise<string>;  // throws SecretNotFoundError if not found, generic Error for backend issues
}
