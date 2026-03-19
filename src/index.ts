#!/usr/bin/env bun

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  console.log(`Usage: ni-gate <command>

Commands:
  run <vars> -- <command>   Run command with secrets injected
  list                      Show available secret names
  permit <var> <level>      Set permission level (always|ask|deny)
  revoke <var>              Set permission to deny
  status                    Show current permission rules
  refresh                   Re-scan backend and rebuild cache`);
  process.exit(0);
}

console.error(`ni-gate: unknown command "${command}". Run "ni-gate --help" for usage.`);
process.exit(4);
