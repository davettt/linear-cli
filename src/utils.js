import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Get the config directory path
 * @returns {string} - Path to ~/.config/linear-cli
 */
export function getConfigDir() {
  return join(homedir(), '.config', 'linear-cli');
}

/**
 * Get the config file path
 * @returns {string} - Path to ~/.config/linear-cli/.env
 */
export function getConfigPath() {
  return join(getConfigDir(), '.env');
}

/**
 * Load API key from config file
 * @returns {string|null} - API key or null if not found
 */
function loadApiKeyFromConfig() {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const match = content.match(/^LINEAR_API_KEY=["']?([^"'\n]+)["']?/m);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Load and parse JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {object} - Parsed JSON
 */
export function loadJsonFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in file: ${filePath}\n${error.message}`);
    }
    throw error;
  }
}

/**
 * Get API key from environment or config file
 * Checks in order: env var, ~/.config/linear-cli/.env, local .env
 * @returns {string} - API key
 */
export function getApiKey() {
  // 1. Check environment variable (highest priority)
  if (process.env.LINEAR_API_KEY) {
    return process.env.LINEAR_API_KEY;
  }

  // 2. Check config file (~/.config/linear-cli/.env)
  const configApiKey = loadApiKeyFromConfig();
  if (configApiKey) {
    return configApiKey;
  }

  // 3. No API key found
  throw new Error(
    'LINEAR_API_KEY not found.\n' +
      'Run "linear-cli init" to set up your API key.\n' +
      'Get your key from: Linear Settings > API > Create key'
  );
}

/**
 * Validate import JSON structure
 * @param {object} data - Parsed JSON data
 */
export function validateImportData(data) {
  if (!data.team) {
    throw new Error('Missing required field: "team"');
  }

  if (!data.issues || !Array.isArray(data.issues)) {
    throw new Error('Missing required field: "issues" (must be an array)');
  }

  for (let i = 0; i < data.issues.length; i++) {
    const issue = data.issues[i];
    if (!issue.title) {
      throw new Error(`Issue at index ${i} is missing required field: "title"`);
    }

    if (issue.subIssues) {
      if (!Array.isArray(issue.subIssues)) {
        throw new Error(`Issue "${issue.title}": "subIssues" must be an array`);
      }

      for (let j = 0; j < issue.subIssues.length; j++) {
        const subIssue = issue.subIssues[j];
        if (!subIssue.title) {
          throw new Error(
            `Sub-issue at index ${j} under "${issue.title}" is missing required field: "title"`
          );
        }
      }
    }
  }
}

/**
 * Format console output with colors
 */
export const log = {
  info: (msg) => console.log(`\x1b[36m${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m${msg}\x1b[0m`),
  error: (msg) => console.error(`\x1b[31m${msg}\x1b[0m`),
  dim: (msg) => console.log(`\x1b[90m${msg}\x1b[0m`),
};
