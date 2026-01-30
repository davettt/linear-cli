import { linearQuery, getTeamByName, getTeamLabels, getWorkflowStates } from '../api.js';
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
 * Execute the list command
 * @param {string} type - Type of resource to list (teams, projects, labels, states)
 * @param {string} teamName - Team name (required for labels and states)
 */
export async function listCommand(type, teamName = null) {
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

    default:
      log.error(`Unknown list type: ${type}`);
      console.log('Available types: teams, projects, labels, states');
      process.exit(1);
  }
}
