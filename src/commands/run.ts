import { loadRules, saveRules, getVarPermission, getVarRule, setVarPermission, type PermissionLevel } from "../config/rules";
import { createBackend } from "../backends/factory";
import { SecretNotFoundError } from "../backends/interface";
import { checkAccess } from "../access";
import { hasTTY, promptSingle, promptMultiple, type VarPromptInfo } from "../prompt";
import { basename } from "path";

interface RunOptions {
  rulesPath?: string;
  cachePath?: string;
}

export function parseRunArgs(args: string[]): { varNames: string[]; command: string[] } {
  const dashDashIndex = args.indexOf("--");
  if (dashDashIndex === -1) {
    throw new Error("ni-gate: usage: ni-gate run <vars> -- <command>");
  }
  const varsStr = args.slice(0, dashDashIndex).join(",");
  const varNames = varsStr.split(",").map(v => v.trim()).filter(Boolean);
  const command = args.slice(dashDashIndex + 1);

  if (varNames.length === 0) {
    throw new Error("ni-gate: usage: ni-gate run <vars> -- <command>");
  }
  if (command.length === 0) {
    throw new Error("ni-gate: usage: ni-gate run <vars> -- <command>");
  }
  return { varNames, command };
}

export async function runRun(args: string[], opts: RunOptions = {}): Promise<number> {
  let parsed;
  try {
    parsed = parseRunArgs(args);
  } catch (e: any) {
    process.stderr.write(e.message + "\n");
    return 4;
  }

  const { varNames, command } = parsed;
  const rules = loadRules(opts.rulesPath);
  const backend = createBackend(rules.backend);
  const commandBinary = basename(command[0]);

  // Check permissions for each var
  const approvedVars: string[] = [];
  const needsPrompt: VarPromptInfo[] = [];

  for (const varName of varNames) {
    const perm = getVarPermission(rules, varName);

    if (perm === "always") {
      approvedVars.push(varName);
    } else if (perm === "deny") {
      process.stderr.write(
        `ni-gate: ACCESS_DENIED — var "${varName}" is denied. Ask user to run:\n  ni-gate permit ${varName} always --commands ${commandBinary}\n`
      );
      return 11;
    } else if (perm === "ask" || perm === null) {
      if (perm === null) {
        setVarPermission(rules, varName, "deny");
        saveRules(opts.rulesPath, rules);
      }
      needsPrompt.push({ name: varName, currentRule: perm ?? "no rule" });
    }
  }

  // Handle prompts
  if (needsPrompt.length > 0) {
    if (!hasTTY()) {
      for (const v of needsPrompt) {
        process.stderr.write(
          `ni-gate: ACCESS_DENIED — var "${v.name}" requires approval. Ask user to run:\n  ni-gate permit ${v.name} always --commands ${commandBinary}\n`
        );
      }
      return 11;
    }

    const commandStr = command.join(" ");
    let decisions: Map<string, PermissionLevel>;

    if (needsPrompt.length === 1) {
      const result = await promptSingle(needsPrompt[0].name, commandStr);
      decisions = new Map([[needsPrompt[0].name, result]]);
    } else {
      decisions = await promptMultiple(needsPrompt, commandStr);
    }

    for (const [varName, decision] of decisions) {
      if (decision === "deny") {
        process.stderr.write(`ni-gate: ACCESS_DENIED — var "${varName}" denied by user.\n`);
        setVarPermission(rules, varName, "deny");
        saveRules(opts.rulesPath, rules);
        return 11;
      }
      if (decision === "always" || decision === "ask") {
        setVarPermission(rules, varName, decision);
        saveRules(opts.rulesPath, rules);
      }
      approvedVars.push(varName);
    }
  }

  // Check access rules for each approved var
  for (const varName of approvedVars) {
    const rule = getVarRule(rules, varName);
    if (rule && (rule.allow_commands || rule.allow_urls)) {
      const result = checkAccess(rule, commandBinary, command);
      if (!result.allowed) {
        if (result.allowed_commands) {
          process.stderr.write(
            `ni-gate: RULE_VIOLATION — var "${varName}" not allowed with command "${commandBinary}". Allowed: [${result.allowed_commands.join(", ")}]. Ask user to update rules.yaml\n`
          );
        } else if (result.allowed_urls) {
          process.stderr.write(
            `ni-gate: RULE_VIOLATION — var "${varName}" not allowed for URL. Allowed: [${result.allowed_urls.map(u => `"${u}"`).join(", ")}]. Ask user to update rules.yaml\n`
          );
        }
        return 12;
      }
    }
  }

  // Fetch secrets
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  for (const varName of approvedVars) {
    try {
      const value = await backend.get(varName);
      env[varName] = value;
    } catch (e: any) {
      if (e instanceof SecretNotFoundError) {
        process.stderr.write(
          `ni-gate: NOT_FOUND — var "${varName}" does not exist. Run "ni-gate list" to see available vars.\n`
        );
        return 10;
      }
      process.stderr.write(
        `ni-gate: BACKEND_ERROR — cannot fetch var "${varName}": ${e.message}\n`
      );
      return 3;
    }
  }

  // Spawn subprocess
  const proc = Bun.spawn(command, {
    env,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  return await proc.exited;
}
