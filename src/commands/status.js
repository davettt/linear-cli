import { getIssueByIdentifier, getTeamByName, getWorkflowStates, updateIssue } from '../api.js';
import { getApiKey, log } from '../utils.js';

/**
 * Execute the status command
 * @param {string} identifier - Issue identifier (e.g., TC-109)
 * @param {string} statusName - Target status name (e.g., "Done", "In Progress")
 */
export async function statusCommand(identifier, statusName) {
  const apiKey = getApiKey();

  if (!identifier) {
    log.error('Error: Missing issue identifier');
    console.log('Usage: linear-cli status <identifier> <status>');
    console.log('Example: linear-cli status TC-109 "Done"');
    process.exit(1);
  }

  if (!statusName) {
    log.error('Error: Missing status name');
    console.log('Usage: linear-cli status <identifier> <status>');
    console.log('Example: linear-cli status TC-109 "Done"');
    console.log('\nUse "linear-cli list states <team>" to see available states.');
    process.exit(1);
  }

  log.info(`Updating ${identifier} status to "${statusName}"...`);

  // Get the issue to find its internal ID and team
  const issue = await getIssueByIdentifier(identifier, false, apiKey);

  if (!issue) {
    log.error(`Issue not found: ${identifier}`);
    process.exit(1);
  }

  // Get workflow states for the issue's team
  const teamKey = issue.team?.key;
  if (!teamKey) {
    log.error('Could not determine team for issue');
    process.exit(1);
  }

  const team = await getTeamByName(teamKey, apiKey);
  const states = await getWorkflowStates(team.id, apiKey);

  // Find matching state (case-insensitive)
  const targetState = states.find((s) => s.name.toLowerCase() === statusName.toLowerCase());

  if (!targetState) {
    log.error(`Status "${statusName}" not found.`);
    console.log('Available states:');
    states.forEach((s) => console.log(`  ${s.name} (${s.type})`));
    process.exit(1);
  }

  // Update the issue
  await updateIssue(issue.id, { stateId: targetState.id }, apiKey);

  log.success(`${identifier} → ${targetState.name}`);
}
