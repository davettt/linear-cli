#!/usr/bin/env node

import 'dotenv/config';
import { importCommand } from '../src/commands/import.js';
import { getCommand } from '../src/commands/get.js';
import { log } from '../src/utils.js';

const HELP_TEXT = `
linear-cli - CLI tool for interacting with Linear

USAGE:
  linear-cli <command> [args] [options]

COMMANDS:
  import <file>       Create issues from a JSON file
  get <identifier>    Get issue details by identifier (e.g., TC-109)

IMPORT OPTIONS:
  --dry-run           Preview changes without creating issues
  --update            Update existing issues instead of skipping

GET OPTIONS:
  --children          Include sub-issues
  --output <file>     Export issue to JSON file

GENERAL OPTIONS:
  --help, -h          Show this help message
  --version, -v       Show version

ENVIRONMENT:
  LINEAR_API_KEY   Required. Your Linear API key.
                   Get it from: Linear Settings > API > Create key

                   Option 1: Copy .env.example to .env and add your key
                   Option 2: export LINEAR_API_KEY="lin_api_xxxxx"

EXAMPLES:
  # Setup (one-time)
  cp .env.example .env   # then edit .env with your key

  # Import issues
  linear-cli import issues.json

  # Preview import (dry run)
  linear-cli import issues.json --dry-run

  # Get issue details
  linear-cli get TC-109

  # Get issue with sub-issues
  linear-cli get TC-100 --children

  # Export issue to JSON file
  linear-cli get TC-100 --output issue.json

  # Export issue with children to JSON
  linear-cli get TC-100 --children --output epic.json

For full documentation, see: README.md
`;

const VERSION = '1.1.0';

async function main() {
  const args = process.argv.slice(2);

  // Handle flags
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(`linear-cli v${VERSION}`);
    process.exit(0);
  }

  const command = args[0];
  const arg1 = args[1];
  const dryRun = args.includes('--dry-run');
  const update = args.includes('--update');

  try {
    switch (command) {
      case 'import':
        if (!arg1) {
          log.error('Error: Missing file path');
          console.log('Usage: linear-cli import <file>');
          process.exit(1);
        }
        await importCommand(arg1, { dryRun, update });
        break;

      case 'get': {
        if (!arg1) {
          log.error('Error: Missing issue identifier');
          console.log('Usage: linear-cli get <identifier> [--children] [--output <file>]');
          process.exit(1);
        }
        const children = args.includes('--children');
        const outputIndex = args.indexOf('--output');
        const output = outputIndex !== -1 ? args[outputIndex + 1] : null;
        await getCommand(arg1, { children, output });
        break;
      }

      default:
        log.error(`Unknown command: ${command}`);
        console.log('Run "linear-cli --help" for usage');
        process.exit(1);
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
