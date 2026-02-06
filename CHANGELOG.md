# Changelog

All notable changes to linear-cli will be documented in this file.

## [1.5.0] - 2026-02-07

### Added

- `list issues <team>` command to list issues with filtering
- `--status` filter: `linear-cli list issues TC --status "Todo"`
- `--project` filter: `linear-cli list issues TC --project "Social Content App"`
- `--label` filter: `linear-cli list issues TC --label "Feature"`
- `--cycle` filter: `linear-cli list issues TC --cycle current` (also `previous`, `next`)
- Filters combine with AND logic
- Open issues shown by default (excludes completed/canceled)
- Paginated API queries for large teams

## [1.4.0] - 2026-02-06

### Added

- `status` command to update issue workflow state
- Example: `linear-cli status TC-109 Done`
- Supports multi-word statuses: `linear-cli status TC-109 "In Progress"`
- Case-insensitive status matching
- Shows available states if given status name doesn't match

## [1.3.0] - 2026-01-25

### Added

- `comment` command to add comments to issues
- Example: `linear-cli comment TC-109 "Fixed in latest commit"`

## [1.2.0] - 2026-01-25

### Added

- `init` command for easy API key setup
- Config stored in `~/.config/linear-cli/.env` (works from any directory)
- API key lookup order: env var → config file → local .env

### Changed

- Simplified setup: just run `linear-cli init`
- Updated help text and documentation

## [1.1.0] - 2026-01-25

### Added

- `get` command to retrieve issue details by identifier
- `--children` flag to include sub-issues in output
- `--output <file>` flag to export issue as import-compatible JSON
- Human-readable terminal output with status icons
- Round-trip support: export with `get --output` then re-import with `import`
- Expanded LLM Integration documentation

## [1.0.0] - 2026-01-24

### Added

- Initial release
- `import` command for creating issues from JSON
- Support for parent issues with nested sub-issues
- Team and project lookup by name
- Label creation if not exists
- `defaultStatus` field to set status for all issues without explicit status
- Dry-run mode for safe testing
- Duplicate detection (skips existing issues by title)
- `--update` flag to update existing issues instead of skipping
- `identifier` field for matching issues by ID (e.g., "TC-110") instead of title
- Reparenting support - move issues to different parents with `--update`
- `assignee` field to assign issues by email or display name
- `.env` file support for API key storage
- JSON schema for validation
