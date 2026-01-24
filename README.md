# linear-cli

CLI tool for importing issues to Linear from JSON files.

Designed for workflows where an LLM generates issue structures that users can review and import with a single command.

## Requirements

- Node.js 18+
- Linear API key

## Installation

```bash
git clone https://github.com/yourusername/linear-cli.git
cd linear-cli
npm install
npm link
```

## Setup

Get your API key from: **Linear Settings > API > Create key**

**Option 1: .env file (recommended)**

```bash
cp .env.example .env
# Edit .env and add your API key
```

**Option 2: Environment variable**

```bash
export LINEAR_API_KEY="lin_api_xxxxx"
```

## Usage

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
| `subIssues`   | No       | Nested sub-issues                                  |

## LLM Integration

This tool works well with LLM-generated JSON. Example prompt:

> "Create a JSON file for linear-cli with issues for [your project]. Use this schema: team, project (optional), and issues array with title, description, labels, and optional subIssues for nested issues."

Then review and import:

```bash
linear-cli import llm-output.json --dry-run  # preview
linear-cli import llm-output.json            # import
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
