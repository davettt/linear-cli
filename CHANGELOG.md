# Changelog

All notable changes to linear-cli will be documented in this file.

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
