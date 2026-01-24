#!/usr/bin/env node

import 'dotenv/config';
import { importCommand } from '../src/commands/import.js';
import { log } from '../src/utils.js';

const HELP_TEXT = `
linear-cli - Import issues to Linear from JSON files

USAGE:
  linear-cli <command> <file> [options]

COMMANDS:
  import <file>    Create issues from a JSON file

OPTIONS:
  --dry-run        Preview changes without creating issues
  --update         Update existing issues instead of skipping
  --help, -h       Show this help message
  --version, -v    Show version

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

JSON FORMAT:
  {
    "team": "Team Name",
    "project": "Project Name",  // optional
    "issues": [
      {
        "title": "Parent Issue",
        "description": "Description",  // optional
        "labels": ["feature"],          // optional
        "status": "Backlog",            // optional
        "subIssues": [                  // optional
          {
            "title": "Sub-issue",
            "labels": ["feature"]
          }
        ]
      }
    ]
  }

For full documentation, see: README.md
`;

const VERSION = '1.0.0';

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
  const filePath = args[1];
  const dryRun = args.includes('--dry-run');
  const update = args.includes('--update');

  if (!filePath && command !== '--help' && command !== '-h') {
    log.error('Error: Missing file path');
    console.log('Usage: linear-cli <command> <file>');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'import':
        await importCommand(filePath, { dryRun, update });
        break;

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
