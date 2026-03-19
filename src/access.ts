import type { VarRule } from "./config/rules";

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  allowed_commands?: string[];
  allowed_urls?: string[];
}

export function extractUrls(args: string[]): string[] {
  const urlPattern = /https?:\/\/[^\s'"]+/g;
  const urls: string[] = [];
  for (const arg of args) {
    const matches = arg.match(urlPattern);
    if (matches) urls.push(...matches);
  }
  return urls;
}

function matchUrlPattern(url: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const regex = new RegExp(escaped);
  const urlWithoutProtocol = url.replace(/^https?:\/\//, "");
  return regex.test(urlWithoutProtocol);
}

export function checkAccess(rule: VarRule, command: string, fullArgs: string[]): AccessCheckResult {
  if (rule.allow_commands && rule.allow_commands.length > 0) {
    if (!rule.allow_commands.includes(command)) {
      return {
        allowed: false,
        reason: `command "${command}" not allowed`,
        allowed_commands: rule.allow_commands,
      };
    }
  }

  if (rule.allow_urls && rule.allow_urls.length > 0) {
    const urls = extractUrls(fullArgs);
    if (urls.length > 0) {
      for (const url of urls) {
        const matches = rule.allow_urls.some(pattern => matchUrlPattern(url, pattern));
        if (!matches) {
          return {
            allowed: false,
            reason: `URL "${url}" not allowed`,
            allowed_urls: rule.allow_urls,
          };
        }
      }
    }
  }

  return { allowed: true };
}
