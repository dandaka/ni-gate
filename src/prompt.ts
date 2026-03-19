import type { PermissionLevel } from "./config/rules";
import * as readline from "readline";

export type PromptResult = PermissionLevel;

export interface VarPromptInfo {
  name: string;
  currentRule: string;
}

export function hasTTY(): boolean {
  return process.stdin.isTTY === true;
}

export function formatPromptSingle(varName: string, command: string): string {
  return `\n🔑 ni-gate: secret requested
   var:     ${varName}
   command: ${command}

   [A]lways / [O]nce / [D]eny? `;
}

export function formatPromptMultiple(vars: VarPromptInfo[], command: string): string {
  const firstLine = `   vars:    ${vars[0].name.padEnd(30)} [${vars[0].currentRule}]`;
  const restLines = vars.slice(1).map(v => `            ${v.name.padEnd(30)} [${v.currentRule}]`).join("\n");
  return `\n🔑 ni-gate: secrets requested
${firstLine}
${restLines}
   command: ${command}

   Approve all? [A]lways / [O]nce / [D]eny / [P]ick? `;
}

function parseChoice(input: string): PromptResult | "pick" | null {
  const c = input.trim().toLowerCase();
  if (c === "a" || c === "always") return "always";
  if (c === "o" || c === "once") return "once";
  if (c === "d" || c === "deny") return "deny";
  if (c === "p" || c === "pick") return "pick";
  return null;
}

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

export async function promptSingle(varName: string, command: string): Promise<PromptResult> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
    terminal: true,
  });
  try {
    const prompt = formatPromptSingle(varName, command);
    while (true) {
      const answer = await askQuestion(rl, prompt);
      const result = parseChoice(answer);
      if (result && result !== "pick") return result;
      process.stderr.write("   Invalid choice. ");
    }
  } finally {
    rl.close();
  }
}

export async function promptMultiple(
  vars: VarPromptInfo[],
  command: string
): Promise<Map<string, PromptResult>> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
    terminal: true,
  });
  const results = new Map<string, PromptResult>();
  try {
    const prompt = formatPromptMultiple(vars, command);
    const answer = await askQuestion(rl, prompt);
    const choice = parseChoice(answer);

    if (choice && choice !== "pick") {
      for (const v of vars) results.set(v.name, choice);
      return results;
    }

    for (const v of vars) {
      while (true) {
        const perVarAnswer = await askQuestion(
          rl,
          `   ${v.name.padEnd(30)} — [A]lways / [O]nce / [D]eny? `
        );
        const perVarChoice = parseChoice(perVarAnswer);
        if (perVarChoice && perVarChoice !== "pick") {
          results.set(v.name, perVarChoice);
          break;
        }
        process.stderr.write("   Invalid choice. ");
      }
    }
    return results;
  } finally {
    rl.close();
  }
}
