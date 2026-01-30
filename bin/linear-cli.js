#!/usr/bin/env node

import 'dotenv/config';
import { importCommand } from '../src/commands/import.js';
import { getCommand } from '../src/commands/get.js';
import { initCommand } from '../src/commands/init.js';
import { commentCommand } from '../src/commands/comment.js';
import { listCommand } from '../src/commands/list.js';
import { log } from '../src/utils.js';

const HELP_TEXT = `
linear-cli - CLI tool for interacting with Linear

USAGE:
  linear-cli <command> [args] [options]

COMMANDS:
  init                      Set up API key (one-time setup)
  get <identifier>          Get issue details by identifier (e.g., TC-109)
  comment <identifier> <msg> Add a comment to an issue
  import <file>             Create issues from a JSON file
  list <type>               List teams, projects, labels, or states

GET OPTIONS:
  --children          Include sub-issues
  --comments          Include comments
  --output <file>     Export issue to JSON file

LIST TYPES:
  teams               List all teams (shows name and key)
  projects            List all projects
  labels <team>       List labels for a team
  states <team>       List workflow states for a team

IMPORT OPTIONS:
  --dry-run           Preview changes without creating issues
  --update            Update existing issues instead of skipping

GENERAL OPTIONS:
  --help, -h          Show this help message
  --version, -v       Show version

EXAMPLES:
  # Setup (one-time)
  linear-cli init

  # Get issue details
  linear-cli get TC-109

  # Get issue with sub-issues
  linear-cli get TC-100 --children

  # Get issue with comments
  linear-cli get TC-109 --comments

  # Export issue to JSON file
  linear-cli get TC-100 --output issue.json

  # Add a comment to an issue
  linear-cli comment TC-109 "Fixed in latest commit"

  # List available teams, projects, labels
  linear-cli list teams
  linear-cli list projects
  linear-cli list labels MyTeam
  linear-cli list states MyTeam

  # Import issues
  linear-cli import issues.json

  # Preview import (dry run)
  linear-cli import issues.json --dry-run

IMPORT JSON FORMAT:
  {
    "team": "TeamName",           // Required: team name or key
    "project": "ProjectName",     // Optional: project name
    "defaultStatus": "Todo",      // Optional: default status for issues
    "issues": [
      {
        "title": "Issue title",           // Required
        "description": "Description",     // Optional (markdown)
        "status": "In Progress",          // Optional: workflow state
        "priority": 2,                    // Optional: 0=none, 1=urgent, 2=high, 3=medium, 4=low
        "estimate": 3,                    // Optional: story points
        "labels": ["bug", "frontend"],    // Optional: label names (created if missing)
        "assignee": "user@email.com",     // Optional: email or name
        "parentId": "TC-112",             // Optional: parent issue identifier
        "subIssues": [                    // Optional: nested sub-issues
          { "title": "Sub-task", "description": "..." }
        ]
      }
    ]
  }

For full documentation, see: README.md
`;

const VERSION = '1.3.0';

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
      case 'init':
        await initCommand();
        break;

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
          console.log(
            'Usage: linear-cli get <identifier> [--children] [--comments] [--output <file>]'
          );
          process.exit(1);
        }
        const children = args.includes('--children');
        const comments = args.includes('--comments');
        const outputIndex = args.indexOf('--output');
        const output = outputIndex !== -1 ? args[outputIndex + 1] : null;
        await getCommand(arg1, { children, comments, output });
        break;
      }

      case 'comment': {
        // Join remaining args after identifier as the comment body
        const commentBody = args.slice(2).join(' ');
        await commentCommand(arg1, commentBody);
        break;
      }

      case 'list': {
        if (!arg1) {
          log.error('Error: Missing list type');
          console.log('Usage: linear-cli list <type> [team]');
          console.log('Types: teams, projects, labels, states');
          process.exit(1);
        }
        const arg2 = args[2];
        await listCommand(arg1, arg2);
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
