import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { createInterface } from 'readline';
import { getConfigDir, getConfigPath, log } from '../utils.js';

/**
 * Prompt user for input
 * @param {string} question - Question to ask
 * @returns {Promise<string>} - User's answer
 */
function prompt(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Execute the init command
 * Sets up API key in ~/.config/linear-cli/.env
 */
export async function initCommand() {
  const configDir = getConfigDir();
  const configPath = getConfigPath();

  log.info('Linear CLI Setup\n');

  // Check if already configured
  if (existsSync(configPath)) {
    const content = readFileSync(configPath, 'utf-8');
    if (content.includes('LINEAR_API_KEY=')) {
      const overwrite = await prompt('API key already configured. Overwrite? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        log.info('Setup cancelled.');
        return;
      }
    }
  }

  console.log('Get your API key from: Linear Settings > API > Create key\n');

  const apiKey = await prompt('Enter your Linear API key: ');

  if (!apiKey) {
    log.error('No API key provided. Setup cancelled.');
    process.exit(1);
  }

  // Validate API key format (basic check)
  if (!apiKey.startsWith('lin_api_')) {
    log.warn('Warning: API key should start with "lin_api_"');
    const proceed = await prompt('Continue anyway? (y/N): ');
    if (proceed.toLowerCase() !== 'y') {
      log.info('Setup cancelled.');
      return;
    }
  }

  // Create config directory
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Write config file
  writeFileSync(configPath, `LINEAR_API_KEY=${apiKey}\n`);

  log.success(`\nAPI key saved to: ${configPath}`);
  log.info('You can now use linear-cli from any directory.');
}
