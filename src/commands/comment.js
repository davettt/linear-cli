import { getIssueByIdentifier, createComment } from '../api.js';
import { getApiKey, log } from '../utils.js';

/**
 * Execute the comment command
 * @param {string} identifier - Issue identifier (e.g., TC-109)
 * @param {string} body - Comment text
 */
export async function commentCommand(identifier, body) {
  const apiKey = getApiKey();

  if (!identifier) {
    log.error('Error: Missing issue identifier');
    console.log('Usage: linear-cli comment <identifier> <message>');
    console.log('Example: linear-cli comment TC-109 "This is done"');
    process.exit(1);
  }

  if (!body) {
    log.error('Error: Missing comment message');
    console.log('Usage: linear-cli comment <identifier> <message>');
    console.log('Example: linear-cli comment TC-109 "This is done"');
    process.exit(1);
  }

  log.info(`Adding comment to ${identifier}...`);

  // First get the issue to retrieve its internal ID
  const issue = await getIssueByIdentifier(identifier, false, apiKey);

  if (!issue) {
    log.error(`Issue not found: ${identifier}`);
    process.exit(1);
  }

  // Create the comment
  const comment = await createComment(issue.id, body, apiKey);

  log.success(`Comment added to ${identifier}`);
  console.log('');
  log.dim(`By: ${comment.user?.name || 'Unknown'}`);
  log.dim(`At: ${new Date(comment.createdAt).toLocaleString()}`);
  console.log('');
  console.log(comment.body);
}
