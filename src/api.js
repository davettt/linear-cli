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
 * Get users in the workspace
 */
export async function getUsers(apiKey) {
  const query = `
    query Users {
      users {
        nodes {
          id
          name
          displayName
          email
          active
        }
      }
    }
  `;

  const data = await linearQuery(query, {}, apiKey);
  return data.users.nodes.filter((user) => user.active);
}

/**
 * Find user by name or email
 */
export function findUserByNameOrEmail(users, identifier) {
  if (!identifier) {
    return null;
  }
  const lower = identifier.toLowerCase();
  return users.find(
    (u) =>
      u.email?.toLowerCase() === lower ||
      u.name?.toLowerCase() === lower ||
      u.displayName?.toLowerCase() === lower
  );
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

/**
 * Get issue by identifier (e.g., "TC-109")
 * @param {string} identifier - Issue identifier like "TC-109"
 * @param {boolean} includeChildren - Whether to fetch sub-issues
 * @param {string} apiKey - Linear API key
 * @returns {Promise<object>} Issue data
 */
export async function getIssueByIdentifier(identifier, includeChildren, apiKey) {
  const childrenFragment = includeChildren
    ? `
        children {
          nodes {
            id
            identifier
            title
            description
            priority
            estimate
            state {
              name
              type
            }
            labels {
              nodes {
                name
              }
            }
            assignee {
              name
              email
            }
          }
        }
      `
    : '';

  const query = `
    query IssueByIdentifier($identifier: String!) {
      issue(id: $identifier) {
        id
        identifier
        title
        description
        priority
        estimate
        state {
          name
          type
        }
        labels {
          nodes {
            name
          }
        }
        assignee {
          name
          email
        }
        parent {
          identifier
          title
        }
        team {
          name
          key
        }
        ${childrenFragment}
      }
    }
  `;

  const data = await linearQuery(query, { identifier }, apiKey);
  return data.issue;
}

/**
 * Create a comment on an issue
 * @param {string} issueId - The issue's internal ID (not identifier)
 * @param {string} body - Comment text (markdown supported)
 * @param {string} apiKey - Linear API key
 * @returns {Promise<object>} Created comment
 */
export async function createComment(issueId, body, apiKey) {
  const mutation = `
    mutation CreateComment($input: CommentCreateInput!) {
      commentCreate(input: $input) {
        success
        comment {
          id
          body
          createdAt
          user {
            name
          }
        }
      }
    }
  `;

  const data = await linearQuery(mutation, { input: { issueId, body } }, apiKey);

  if (!data.commentCreate.success) {
    throw new Error('Failed to create comment');
  }

  return data.commentCreate.comment;
}

/**
 * Get filtered issues for a team with pagination
 * @param {string} teamId - Team internal ID
 * @param {object} filter - Linear IssueFilter object (optional)
 * @param {string} apiKey - Linear API key
 * @returns {Promise<object[]>} Array of issue nodes
 */
export async function getFilteredTeamIssues(teamId, filter, apiKey) {
  const query = `
    query TeamIssues($teamId: String!, $filter: IssueFilter, $first: Int, $after: String) {
      team(id: $teamId) {
        issues(filter: $filter, first: $first, after: $after, orderBy: updatedAt) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            identifier
            title
            priority
            state {
              name
              type
            }
            labels {
              nodes {
                name
              }
            }
            assignee {
              name
            }
            project {
              name
            }
          }
        }
      }
    }
  `;

  const allIssues = [];
  let hasNextPage = true;
  let after = null;

  while (hasNextPage) {
    const variables = { teamId, filter: filter || undefined, first: 50, after };
    const data = await linearQuery(query, variables, apiKey);
    const connection = data.team.issues;
    allIssues.push(...connection.nodes);
    hasNextPage = connection.pageInfo.hasNextPage;
    after = connection.pageInfo.endCursor;
  }

  return allIssues;
}

/**
 * Get issues in the team's active (current) cycle
 * @param {string} teamId - Team internal ID
 * @param {string} apiKey - Linear API key
 * @returns {Promise<{cycle: object, issues: object[]}|null>} Cycle info and issues
 */
export async function getActiveCycleIssues(teamId, apiKey) {
  const query = `
    query TeamActiveCycle($teamId: String!) {
      team(id: $teamId) {
        activeCycle {
          id
          number
          name
          startsAt
          endsAt
          issues {
            nodes {
              identifier
              title
              priority
              state {
                name
                type
              }
              labels {
                nodes {
                  name
                }
              }
              assignee {
                name
              }
              project {
                name
              }
            }
          }
        }
      }
    }
  `;

  const data = await linearQuery(query, { teamId }, apiKey);
  const cycle = data.team.activeCycle;

  if (!cycle) {
    return null;
  }

  return {
    cycle: {
      id: cycle.id,
      number: cycle.number,
      name: cycle.name,
      startsAt: cycle.startsAt,
      endsAt: cycle.endsAt,
    },
    issues: cycle.issues.nodes,
  };
}

/**
 * Get issues for a relative cycle (previous, current, or next)
 * @param {string} teamId - Team internal ID
 * @param {string} which - "current", "previous", or "next"
 * @param {string} apiKey - Linear API key
 * @returns {Promise<{cycle: object, issues: object[]}|null>}
 */
export async function getCycleIssues(teamId, which, apiKey) {
  if (which === 'current') {
    return getActiveCycleIssues(teamId, apiKey);
  }

  // Fetch cycle list and active cycle ID
  const listQuery = `
    query TeamCycles($teamId: String!) {
      team(id: $teamId) {
        activeCycle { id }
        cycles(orderBy: startsAt, first: 50) {
          nodes {
            id
            number
            name
            startsAt
            endsAt
          }
        }
      }
    }
  `;

  const listData = await linearQuery(listQuery, { teamId }, apiKey);
  const activeCycleId = listData.team.activeCycle?.id;
  const cycles = listData.team.cycles.nodes;

  if (!activeCycleId) {
    return null;
  }

  const activeIndex = cycles.findIndex((c) => c.id === activeCycleId);
  const targetIndex = which === 'previous' ? activeIndex - 1 : activeIndex + 1;

  if (targetIndex < 0 || targetIndex >= cycles.length) {
    return null;
  }

  const targetCycle = cycles[targetIndex];

  // Fetch issues for target cycle
  const issuesQuery = `
    query CycleIssues($cycleId: String!) {
      cycle(id: $cycleId) {
        issues {
          nodes {
            identifier
            title
            priority
            state {
              name
              type
            }
            labels {
              nodes {
                name
              }
            }
            assignee {
              name
            }
            project {
              name
            }
          }
        }
      }
    }
  `;

  const issuesData = await linearQuery(issuesQuery, { cycleId: targetCycle.id }, apiKey);

  return {
    cycle: targetCycle,
    issues: issuesData.cycle.issues.nodes,
  };
}

/**
 * Get comments for an issue
 * @param {string} issueId - The issue's internal ID
 * @param {string} apiKey - Linear API key
 * @returns {Promise<object[]>} Array of comments
 */
export async function getComments(issueId, apiKey) {
  const query = `
    query IssueComments($issueId: String!) {
      issue(id: $issueId) {
        comments {
          nodes {
            id
            body
            createdAt
            user {
              name
              email
            }
          }
        }
      }
    }
  `;

  const data = await linearQuery(query, { issueId }, apiKey);
  return data.issue?.comments?.nodes || [];
}
