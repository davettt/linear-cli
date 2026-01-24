/**
 * Linear GraphQL API client
 */

const LINEAR_API_URL = 'https://api.linear.app/graphql';

/**
 * Execute a GraphQL query against Linear API
 * @param {string} query - GraphQL query or mutation
 * @param {object} variables - Query variables
 * @param {string} apiKey - Linear API key
 * @returns {Promise<object>} - Response data
 */
export async function linearQuery(query, variables, apiKey) {
  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Linear API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL error: ${result.errors.map((e) => e.message).join(', ')}`);
  }

  return result.data;
}

/**
 * Get team by name
 */
export async function getTeamByName(teamName, apiKey) {
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
  const team = data.teams.nodes.find(
    (t) =>
      t.name.toLowerCase() === teamName.toLowerCase() ||
      t.key.toLowerCase() === teamName.toLowerCase()
  );

  if (!team) {
    throw new Error(`Team "${teamName}" not found`);
  }

  return team;
}

/**
 * Get project by name within a team
 */
export async function getProjectByName(projectName, teamId, apiKey) {
  const query = `
    query Projects {
      projects {
        nodes {
          id
          name
        }
      }
    }
  `;

  const data = await linearQuery(query, {}, apiKey);
  const project = data.projects.nodes.find(
    (p) => p.name.toLowerCase() === projectName.toLowerCase()
  );

  return project || null;
}

/**
 * Get all labels for a team
 */
export async function getTeamLabels(teamId, apiKey) {
  const query = `
    query Labels {
      issueLabels {
        nodes {
          id
          name
          team {
            id
          }
        }
      }
    }
  `;

  const data = await linearQuery(query, {}, apiKey);
  // Filter to team-specific labels and workspace labels (no team)
  return data.issueLabels.nodes.filter((label) => !label.team || label.team.id === teamId);
}

/**
 * Create a label for a team
 */
export async function createLabel(name, teamId, apiKey) {
  const mutation = `
    mutation CreateLabel($input: IssueLabelCreateInput!) {
      issueLabelCreate(input: $input) {
        success
        issueLabel {
          id
          name
        }
      }
    }
  `;

  const data = await linearQuery(
    mutation,
    {
      input: {
        name,
        teamId,
      },
    },
    apiKey
  );

  if (!data.issueLabelCreate.success) {
    throw new Error(`Failed to create label "${name}"`);
  }

  return data.issueLabelCreate.issueLabel;
}

/**
 * Create an issue
 */
export async function createIssue(input, apiKey) {
  const mutation = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          title
          url
        }
      }
    }
  `;

  const data = await linearQuery(mutation, { input }, apiKey);

  if (!data.issueCreate.success) {
    throw new Error(`Failed to create issue "${input.title}"`);
  }

  return data.issueCreate.issue;
}

/**
 * Get existing issues for a team (for duplicate checking)
 */
export async function getTeamIssues(teamId, apiKey) {
  const query = `
    query Issues {
      issues(first: 250) {
        nodes {
          id
          identifier
          title
          team {
            id
          }
          parent {
            id
          }
        }
      }
    }
  `;

  const data = await linearQuery(query, {}, apiKey);
  return data.issues.nodes.filter((issue) => issue.team.id === teamId);
}

/**
 * Update an existing issue
 */
export async function updateIssue(issueId, input, apiKey) {
  const mutation = `
    mutation UpdateIssue($issueId: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $issueId, input: $input) {
        success
        issue {
          id
          identifier
          title
          url
        }
      }
    }
  `;

  const data = await linearQuery(mutation, { issueId, input }, apiKey);

  if (!data.issueUpdate.success) {
    throw new Error(`Failed to update issue "${issueId}"`);
  }

  return data.issueUpdate.issue;
}

/**
 * Get workflow states for a team
 */
export async function getWorkflowStates(teamId, apiKey) {
  const query = `
    query WorkflowStates {
      workflowStates {
        nodes {
          id
          name
          type
          team {
            id
          }
        }
      }
    }
  `;

  const data = await linearQuery(query, {}, apiKey);
  return data.workflowStates.nodes.filter((state) => state.team.id === teamId);
}
