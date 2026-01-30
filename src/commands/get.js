import { writeFileSync } from 'fs';
import { getIssueByIdentifier, getComments } from '../api.js';
import { getApiKey, log } from '../utils.js';

/**
 * Get status icon based on state type
 */
function getStatusIcon(stateType) {
  switch (stateType) {
    case 'completed':
      return '✓';
    case 'canceled':
      return '✗';
    case 'started':
      return '▶';
    default:
      return '';
  }
}

/**
 * Format issue for terminal display (human-readable)
 */
function formatIssueForTerminal(issue) {
  const lines = [];

  // Title line with identifier
  lines.push(`${issue.identifier}: ${issue.title}`);

  // Status
  const statusIcon = getStatusIcon(issue.state?.type);
  lines.push(`Status: ${issue.state?.name || 'Unknown'} ${statusIcon}`);

  // Labels
  const labels = issue.labels?.nodes?.map((l) => l.name) || [];
  if (labels.length > 0) {
    lines.push(`Labels: ${labels.join(', ')}`);
  }

  // Priority
  if (issue.priority) {
    const priorityNames = ['No priority', 'Urgent', 'High', 'Medium', 'Low'];
    lines.push(`Priority: ${priorityNames[issue.priority] || issue.priority}`);
  }

  // Estimate
  if (issue.estimate) {
    lines.push(`Estimate: ${issue.estimate}`);
  }

  // Assignee
  if (issue.assignee) {
    lines.push(`Assignee: ${issue.assignee.name}`);
  }

  // Parent
  if (issue.parent) {
    lines.push(`Parent: ${issue.parent.identifier} (${issue.parent.title})`);
  }

  // Description
  if (issue.description) {
    lines.push('');
    lines.push('Description:');
    const descLines = issue.description.split('\n');
    descLines.forEach((line) => {
      lines.push(line);
    });
  }

  return lines.join('\n');
}

/**
 * Format a child issue as a summary line
 */
function formatChildSummary(child) {
  const statusIcon = getStatusIcon(child.state?.type);
  const status = child.state?.name || 'Unknown';

  if (child.state?.type === 'completed') {
    return `  ${child.identifier}: ${child.title} ${statusIcon}`;
  }
  return `  ${child.identifier}: ${child.title} (${status})`;
}

/**
 * Convert issue to import-compatible JSON format
 */
function formatIssueForExport(issue, teamName) {
  const formatSingleIssue = (iss) => {
    const formatted = {
      identifier: iss.identifier,
      title: iss.title,
    };

    if (iss.description) {
      formatted.description = iss.description;
    }

    if (iss.state?.name) {
      formatted.status = iss.state.name;
    }

    const labels = iss.labels?.nodes?.map((l) => l.name) || [];
    if (labels.length > 0) {
      formatted.labels = labels;
    }

    if (iss.priority) {
      const priorityNames = ['none', 'urgent', 'high', 'medium', 'low'];
      formatted.priority = priorityNames[iss.priority] || iss.priority;
    }

    if (iss.estimate) {
      formatted.estimate = iss.estimate;
    }

    if (iss.assignee?.email) {
      formatted.assignee = iss.assignee.email;
    }

    return formatted;
  };

  const mainIssue = formatSingleIssue(issue);

  // Add children as subIssues
  if (issue.children?.nodes?.length > 0) {
    mainIssue.subIssues = issue.children.nodes.map(formatSingleIssue);
  }

  return {
    team: teamName,
    issues: [mainIssue],
  };
}

/**
 * Format a comment for terminal display
 */
function formatComment(comment) {
  const date = new Date(comment.createdAt).toLocaleString();
  const author = comment.user?.name || 'Unknown';
  return `[${date}] ${author}:\n${comment.body}`;
}

/**
 * Execute the get command
 * @param {string} identifier - Issue identifier (e.g., TC-109)
 * @param {object} options - Command options
 * @param {boolean} options.children - Include sub-issues
 * @param {boolean} options.comments - Include comments
 * @param {string} options.output - Output file path for JSON export
 */
export async function getCommand(identifier, options = {}) {
  const apiKey = getApiKey();
  const {
    children: includeChildren = false,
    comments: includeComments = false,
    output: outputFile = null,
  } = options;

  if (!identifier) {
    log.error('Error: Missing issue identifier');
    console.log('Usage: linear-cli get <identifier> [--children] [--comments] [--output <file>]');
    console.log('Example: linear-cli get TC-109');
    process.exit(1);
  }

  log.info(`Fetching issue ${identifier}...`);

  const issue = await getIssueByIdentifier(identifier, includeChildren, apiKey);

  if (!issue) {
    log.error(`Issue not found: ${identifier}`);
    process.exit(1);
  }

  // Display human-readable output to terminal
  console.log('');
  console.log(formatIssueForTerminal(issue));

  // Display children summary if present
  if (issue.children?.nodes?.length > 0) {
    console.log('');
    console.log(`Sub-issues (${issue.children.nodes.length}):`);
    issue.children.nodes.forEach((child) => {
      console.log(formatChildSummary(child));
    });
  }

  // Display comments if requested
  if (includeComments) {
    const comments = await getComments(issue.id, apiKey);
    console.log('');
    if (comments.length === 0) {
      log.dim('No comments');
    } else {
      console.log(`Comments (${comments.length}):`);
      console.log('');
      comments.forEach((comment, index) => {
        console.log(formatComment(comment));
        if (index < comments.length - 1) {
          console.log('---');
        }
      });
    }
  }

  // Write JSON file if --output specified
  if (outputFile) {
    const teamName = issue.team?.name || 'Unknown';
    const exportData = formatIssueForExport(issue, teamName);
    writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
    console.log('');
    log.success(`Exported to: ${outputFile}`);
  }
}
