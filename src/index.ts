#!/usr/bin/env bun

import { runRun } from "./commands/run";
import { runList } from "./commands/list";
import { runPermit, parsePermitFlags } from "./commands/permit";
import { runRevoke } from "./commands/revoke";
import { runStatus } from "./commands/status";
import { runRefresh } from "./commands/refresh";

const args = process.argv.slice(2);
const command = args[0];

const USAGE = `Usage: ni-gate <command>

Commands:
  run <vars> -- <command>   Run command with secrets injected
  list                      Show available secret names
  permit <var> <level> [--commands cmd1,cmd2] [--urls pattern1,pattern2] [--force]
                            Set permission with scope
  revoke <var>              Set permission to deny
  status                    Show current permission rules
  refresh                   Re-scan backend and rebuild cache`;

async function main() {
  if (!command || command === "--help" || command === "-h") {
    console.log(USAGE);
    process.exit(0);
  }

  switch (command) {
    case "run": {
      const exitCode = await runRun(args.slice(1));
      process.exit(exitCode);
      break;
    }
    case "list": {
      await runList();
      break;
    }
    case "permit": {
      const varName = args[1];
      const level = args[2];
      if (!varName || !level) {
        console.error("ni-gate: usage: ni-gate permit <var> <level> --commands <cmd> [--urls <pattern>] [--force]");
        process.exit(4);
      }
      const flags = parsePermitFlags(args.slice(3));
      const exitCode = await runPermit(varName, level, flags);
      process.exit(exitCode);
      break;
    }
    case "revoke": {
      const varName = args[1];
      if (!varName) {
        console.error("ni-gate: usage: ni-gate revoke <var>");
        process.exit(4);
      }
      await runRevoke(varName);
      break;
    }
    case "status": {
      await runStatus();
      break;
    }
    case "refresh": {
      await runRefresh();
      break;
    }
    default:
      console.error(`ni-gate: unknown command "${command}". Run "ni-gate --help" for usage.`);
      process.exit(4);
  }
}

main().catch((err) => {
  console.error(`ni-gate: ${err.message}`);
  process.exit(1);
});
