# linear-cli

CLI tool for interacting with Linear issues.

Features:

- **Get** issue details by identifier with human-readable output or JSON export
- **Status** update issue workflow state from the command line
- **Comment** on issues directly
- **Import** issues from JSON files (great for LLM-generated issue structures)
- **List** teams, projects, labels, and workflow states

## Requirements

- Node.js 18+
- Linear API key (get from: Linear Settings > API > Create key)

## Installation

**Option 1: Install from GitHub (recommended)**

```bash
npm install -g github:davettt/linear-cli
linear-cli init
```

**Option 2: Clone and link (for development)**

```bash
git clone https://github.com/davettt/linear-cli.git
cd linear-cli
npm install
npm link
linear-cli init
```

## Setup

Run the init command and enter your API key when prompted:

```bash
linear-cli init
```

This saves your key to `~/.config/linear-cli/.env` so it works from any directory.

**Alternative: Environment variable**

```bash
export LINEAR_API_KEY="lin_api_xxxxx"
```

## Usage

### Get Issue Details

```bash
# Get issue by identifier
linear-cli get TC-109

# Include sub-issues
linear-cli get TC-100 --children

# Export to JSON file (import-compatible format)
linear-cli get TC-100 --output issue.json

# Export with children
linear-cli get TC-100 --children --output epic.json
```

### Update Issue Status

```bash
# Mark an issue as done
linear-cli status TC-109 Done

# Set to in progress
linear-cli status TC-109 "In Progress"

# Move to backlog
linear-cli status TC-109 Backlog
```

Status names are case-insensitive. If the status doesn't match, available states are listed. Use `linear-cli list states <team>` to see all workflow states.

### Add Comments

```bash
# Add a comment to an issue
linear-cli comment TC-109 "Fixed in latest commit"

# Multi-word comments work naturally
linear-cli comment TC-126 "Implemented ActivityView with timer and tips section"
```

**Terminal output (human-readable):**

```
TC-109: Test on simulator + real device
Status: In Progress ▶
Labels: testing, phase-1

Description:
## Manual Testing Checklist
...

Sub-issues (3):
  TC-110: Test app launch ✓
  TC-111: Test home view (In Progress)
  TC-112: Test completion flow (Todo)
```

**JSON output (import-compatible):**

```json
{
  "team": "TiongCreative",
  "issues": [
    {
      "identifier": "TC-109",
      "title": "Test on simulator + real device",
      "description": "...",
      "status": "In Progress",
      "labels": ["testing"],
      "subIssues": [...]
    }
  ]
}
```

### Import Issues

```bash
# Preview import (dry run)
linear-cli import issues.json --dry-run

# Import issues
linear-cli import issues.json

# Update existing issues (instead of skipping)
linear-cli import issues.json --update

# Show help
linear-cli --help
```

**Notes:**

- By default, existing issues (matched by title) are skipped
- Use `--update` to update existing issues with new status, labels, or description

**Important when using `--update`:**

- All matching issues in your JSON will be updated with the values specified
- Only include issues you actually want to update in your JSON file
- Always run with `--dry-run --update` first to preview what changes will be made
- Use `identifier` field (e.g., "TC-110") for reliable matching instead of title

**Reparenting issues:**

To move an issue under a different parent, use the identifier and place it under the new parent:

```json
{
  "team": "My Team",
  "issues": [
    {
      "title": "New Parent",
      "identifier": "TC-100",
      "subIssues": [
        {
          "title": "Issue to reparent",
          "identifier": "TC-110"
        }
      ]
    }
  ]
}
```

Then run: `linear-cli import reparent.json --update`

## JSON Format

### Simple (flat issues)

```json
{
  "team": "My Team",
  "issues": [
    {
      "title": "First issue",
      "description": "Issue description",
      "labels": ["feature"]
    }
  ]
}
```

### With sub-issues

```json
{
  "team": "My Team",
  "project": "My Project",
  "defaultStatus": "Backlog",
  "issues": [
    {
      "title": "Epic: User Authentication",
      "description": "Parent issue description",
      "labels": ["epic"],
      "subIssues": [
        {
          "title": "Create login page",
          "labels": ["feature"]
        },
        {
          "title": "Create registration page",
          "labels": ["feature"]
        }
      ]
    }
  ]
}
```

### Available Fields

| Field           | Required | Description                                     |
| --------------- | -------- | ----------------------------------------------- |
| `team`          | Yes      | Team name or key                                |
| `project`       | No       | Project to add issues to                        |
| `defaultStatus` | No       | Default status for all issues (e.g., "Backlog") |
| `issues`        | Yes      | Array of issues                                 |

#### Issue Fields

| Field         | Required | Description                                        |
| ------------- | -------- | -------------------------------------------------- |
| `title`       | Yes      | Issue title                                        |
| `identifier`  | No       | Issue ID (e.g., "TC-110") for matching with update |
| `description` | No       | Markdown description                               |
| `labels`      | No       | Label names (created if missing)                   |
| `status`      | No       | Workflow state (e.g., "Backlog", "Todo")           |
| `priority`    | No       | 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low          |
| `estimate`    | No       | Estimate points                                    |
| `assignee`    | No       | Assignee by email or display name                  |
| `subIssues`   | No       | Nested sub-issues                                  |

## LLM Integration

After running `npm link`, the CLI is globally available. LLMs can use it directly:

### Checking Issues

```bash
# View issue details
linear-cli get TC-109

# View epic with all sub-issues
linear-cli get TC-100 --children

# Export issue to JSON for analysis
linear-cli get TC-100 --children --output issue.json
```

### Creating Issues

LLMs can generate JSON and import it:

```bash
# Create issues.json with the schema below, then:
linear-cli import issues.json --dry-run  # preview
linear-cli import issues.json            # import
```

Example prompt for generating issues:

> "Create a JSON file for linear-cli with issues for [your project]. Use this schema: team, project (optional), and issues array with title, description, labels, and optional subIssues for nested issues."

### For Project Documentation

Add to your project's README or `.claude/instructions.md`:

```markdown
## Linear Integration

Use `linear-cli` to interact with Linear issues:

- `linear-cli get <ID>` - View issue details
- `linear-cli get <ID> --children` - Include sub-issues
- `linear-cli status <ID> Done` - Update issue status
- `linear-cli comment <ID> "message"` - Add a comment
- `linear-cli import <file.json> --dry-run` - Preview import
- `linear-cli import <file.json>` - Create issues from JSON
```

## Examples

See `examples/` directory:

- `simple.json` - Basic flat issues
- `with-sub-issues.json` - Parent issues with nested sub-issues

## Development

```bash
npm run lint        # ESLint
npm run format      # Prettier
npm run check       # Both
npm run security    # npm audit
```

## License

MIT
