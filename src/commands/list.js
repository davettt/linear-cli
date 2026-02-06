import {
  linearQuery,
  getTeamByName,
  getTeamLabels,
  getWorkflowStates,
  getFilteredTeamIssues,
  getCycleIssues,
} from '../api.js';
import { getApiKey, log } from '../utils.js';

/**
 * Get all teams
 */
async function getTeams(apiKey) {
  const query = `
    query Teams {
      teams {
        nodes {
          id
          name
          key
        }
      }
    }
  `;

  const data = await linearQuery(query, {}, apiKey);
  return data.teams.nodes;
}

/**
 * Get all projects
 */
async function getProjects(apiKey) {
  const query = `
    query Projects {
      projects {
        nodes {
          id
          name
          state
        }
      }
    }
  `;

  const data = await linearQuery(query, {}, apiKey);
  return data.projects.nodes;
}

/**
 * Priority number to short label
 */
function priorityLabel(priority) {
  const map = { 1: 'Urgent', 2: 'High', 3: 'Medium', 4: 'Low' };
  return map[priority] || '';
}

/**
 * Format a single issue as a compact one-line summary
 */
function formatIssueLine(issue) {
  const parts = [issue.identifier];

  const status = issue.state?.name || '';
  parts.push(`[${status}]`);

  const prio = priorityLabel(issue.priority);
  if (prio) {
    parts.push(`(${prio})`);
  }

  parts.push(issue.title);

  const labels = issue.labels?.nodes?.map((l) => l.name) || [];
  if (labels.length > 0) {
    parts.push(`{${labels.join(', ')}}`);
  }

  if (issue.assignee?.name) {
    parts.push(`@${issue.assignee.name}`);
  }

  return '  ' + parts.join(' ');
}

/**
 * Build a Linear IssueFilter from CLI options
 */
function buildIssueFilter(options) {
  const filter = {};

  if (options.status) {
    filter.state = { name: { eq: options.status } };
  } else {
    // Default: exclude completed and canceled issues
    filter.state = { type: { nin: ['completed', 'canceled'] } };
  }

  if (options.project) {
    filter.project = { name: { eq: options.project } };
  }

  if (options.label) {
    filter.labels = { name: { eq: options.label } };
  }

  return filter;
}

/**
 * Execute the list command
 * @param {string} type - Type of resource to list (teams, projects, labels, states, issues)
 * @param {string} teamName - Team name (required for labels, states, and issues)
 * @param {object} options - Additional options (status, project, label, cycle)
 */
export async function listCommand(type, teamName = null, options = {}) {
  const apiKey = getApiKey();

  switch (type) {
    case 'teams': {
      const teams = await getTeams(apiKey);
      console.log('Teams:');
      for (const team of teams) {
        console.log(`  ${team.name} (${team.key})`);
      }
      break;
    }

    case 'projects': {
      const projects = await getProjects(apiKey);
      console.log('Projects:');
      for (const project of projects) {
        console.log(`  ${project.name} [${project.state}]`);
      }
      break;
    }

    case 'labels': {
      if (!teamName) {
        log.error('Error: Team name required for listing labels');
        console.log('Usage: linear-cli list labels <team>');
        process.exit(1);
      }
      const team = await getTeamByName(teamName, apiKey);
      const labels = await getTeamLabels(team.id, apiKey);
      console.log(`Labels for ${team.name}:`);
      for (const label of labels) {
        console.log(`  ${label.name}`);
      }
      break;
    }

    case 'states': {
      if (!teamName) {
        log.error('Error: Team name required for listing states');
        console.log('Usage: linear-cli list states <team>');
        process.exit(1);
      }
      const team = await getTeamByName(teamName, apiKey);
      const states = await getWorkflowStates(team.id, apiKey);
      console.log(`Workflow states for ${team.name}:`);
      for (const state of states) {
        console.log(`  ${state.name} (${state.type})`);
      }
      break;
    }

    case 'issues': {
      if (!teamName) {
        log.error('Error: Team name required for listing issues');
        console.log(
          'Usage: linear-cli list issues <team> [--status "Todo"] [--project "Name"] [--label "Feature"] [--cycle current]'
        );
        process.exit(1);
      }

      const team = await getTeamByName(teamName, apiKey);

      // Cycle mode
      if (options.cycle) {
        const validCycles = ['current', 'previous', 'next'];
        if (!validCycles.includes(options.cycle)) {
          log.error(`Invalid cycle: "${options.cycle}". Use: current, previous, or next`);
          process.exit(1);
        }

        log.info(`Fetching ${options.cycle} cycle for ${team.name}...`);
        const result = await getCycleIssues(team.id, options.cycle, apiKey);

        if (!result) {
          log.warn(`No ${options.cycle} cycle found for ${team.name}`);
          process.exit(0);
        }

        const { cycle, issues } = result;
        const start = new Date(cycle.startsAt).toLocaleDateString();
        const end = new Date(cycle.endsAt).toLocaleDateString();
        console.log(
          `\nCycle ${cycle.number}${cycle.name ? ': ' + cycle.name : ''} (${start} - ${end})`
        );
        console.log(`${issues.length} issues:\n`);

        for (const issue of issues) {
          console.log(formatIssueLine(issue));
        }
        break;
      }

      // Standard filtered issues mode
      const filter = buildIssueFilter(options);
      log.info(`Fetching issues for ${team.name}...`);
      const issues = await getFilteredTeamIssues(team.id, filter, apiKey);

      const filterParts = [];
      if (options.status) {
        filterParts.push(`status="${options.status}"`);
      }
      if (options.project) {
        filterParts.push(`project="${options.project}"`);
      }
      if (options.label) {
        filterParts.push(`label="${options.label}"`);
      }
      const filterDesc = filterParts.length > 0 ? ` (${filterParts.join(', ')})` : ' (open)';

      console.log(`\nIssues for ${team.name}${filterDesc}: ${issues.length} found\n`);

      if (issues.length === 0) {
        log.dim('No issues found matching the filters.');
        break;
      }

      for (const issue of issues) {
        console.log(formatIssueLine(issue));
      }
      break;
    }

    default:
      log.error(`Unknown list type: ${type}`);
      console.log('Available types: teams, projects, labels, states, issues');
      process.exit(1);
  }
}
