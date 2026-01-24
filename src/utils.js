import { readFileSync } from 'fs';

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
 * Get API key from environment
 * @returns {string} - API key
 */
export function getApiKey() {
  const apiKey = process.env.LINEAR_API_KEY;

  if (!apiKey) {
    throw new Error(
      'LINEAR_API_KEY environment variable is required.\n' +
        'Get your API key from: Linear Settings > API > Create key\n' +
        'Then run: export LINEAR_API_KEY="lin_api_xxxxx"'
    );
  }

  return apiKey;
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
