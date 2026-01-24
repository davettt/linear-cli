import {
  getTeamByName,
  getProjectByName,
  getTeamLabels,
  getTeamIssues,
  createLabel,
  createIssue,
  updateIssue,
  getWorkflowStates,
} from '../api.js';
import { loadJsonFile, getApiKey, validateImportData, log } from '../utils.js';

/**
 * Resolve label names to IDs, creating labels that don't exist
 */
async function resolveLabelIds(labelNames, teamId, existingLabels, apiKey, dryRun) {
  const labelIds = [];

  for (const labelName of labelNames) {
    let label = existingLabels.find((l) => l.name.toLowerCase() === labelName.toLowerCase());

    if (!label) {
      if (dryRun) {
        log.dim(`  [dry-run] Would create label: ${labelName}`);
      } else {
        log.dim(`  Creating label: ${labelName}`);
        label = await createLabel(labelName, teamId, apiKey);
        existingLabels.push(label);
      }
    }

    if (label) {
      labelIds.push(label.id);
    }
  }

  return labelIds;
}

/**
 * Resolve status name to workflow state ID
 */
function resolveStatusId(statusName, workflowStates) {
  if (!statusName) {
    return null;
  }

  const state = workflowStates.find((s) => s.name.toLowerCase() === statusName.toLowerCase());

  if (!state) {
    const available = workflowStates.map((s) => s.name).join(', ');
    throw new Error(`Status "${statusName}" not found. Available: ${available}`);
  }

  return state.id;
}

/**
 * Build issue input object
 */
function buildIssueInput(issue, teamId, projectId, labelIds, stateId, parentId = null) {
  const input = {
    title: issue.title,
    teamId,
  };

  if (issue.description) {
    input.description = issue.description;
  }

  if (projectId) {
    input.projectId = projectId;
  }

  if (labelIds.length > 0) {
    input.labelIds = labelIds;
  }

  if (stateId) {
    input.stateId = stateId;
  }

  if (parentId) {
    input.parentId = parentId;
  }

  if (issue.priority !== undefined) {
    input.priority = issue.priority;
  }

  if (issue.estimate !== undefined) {
    input.estimate = issue.estimate;
  }

  return input;
}

/**
 * Import command handler
 */
export async function importCommand(filePath, options = {}) {
  const { dryRun = false, update = false } = options;

  if (dryRun) {
    log.warn('Running in dry-run mode - no changes will be made\n');
  }

  if (update) {
    log.info('Update mode enabled - existing issues will be updated\n');
  }

  // Load and validate JSON
  log.info(`Loading ${filePath}...`);
  const data = loadJsonFile(filePath);
  validateImportData(data);

  // Get API key
  const apiKey = getApiKey();

  // Resolve team
  log.info(`Looking up team: ${data.team}`);
  const team = await getTeamByName(data.team, apiKey);
  log.success(`Found team: ${team.name} (${team.key})`);

  // Resolve project (optional)
  let project = null;
  if (data.project) {
    log.info(`Looking up project: ${data.project}`);
    project = await getProjectByName(data.project, team.id, apiKey);
    if (project) {
      log.success(`Found project: ${project.name}`);
    } else {
      log.warn(`Project "${data.project}" not found - issues will be created without a project`);
    }
  }

  // Get existing labels, workflow states, and issues
  const existingLabels = await getTeamLabels(team.id, apiKey);
  const workflowStates = await getWorkflowStates(team.id, apiKey);
  const existingIssues = await getTeamIssues(team.id, apiKey);

  log.dim(`Found ${existingIssues.length} existing issues in team`);

  // Resolve default status if specified
  const defaultStateId = data.defaultStatus
    ? resolveStatusId(data.defaultStatus, workflowStates)
    : null;

  if (data.defaultStatus) {
    log.dim(`Default status: ${data.defaultStatus}`);
  }

  // Track created, updated, and skipped issues
  const createdIssues = [];
  const updatedIssues = [];
  const skippedIssues = [];

  // Helper to find existing issue - by identifier if provided, otherwise by title
  const findExistingIssue = (issue, parentId = null) => {
    // Match by identifier if provided (most reliable)
    if (issue.identifier) {
      return existingIssues.find(
        (i) => i.identifier.toLowerCase() === issue.identifier.toLowerCase()
      );
    }
    // Fall back to title matching under same parent
    return existingIssues.find(
      (i) =>
        i.title.toLowerCase() === issue.title.toLowerCase() &&
        (parentId ? i.parent?.id === parentId : !i.parent)
    );
  };

  // Process issues
  log.info(`\nProcessing ${data.issues.length} issues...`);

  for (const issue of data.issues) {
    // Check for existing parent issue
    const existingParent = findExistingIssue(issue);

    // Resolve labels for parent issue
    const parentLabels = issue.labels || [];
    const parentLabelIds = await resolveLabelIds(
      parentLabels,
      team.id,
      existingLabels,
      apiKey,
      dryRun
    );

    // Resolve status (use issue status or fall back to default)
    const parentStateId = issue.status
      ? resolveStatusId(issue.status, workflowStates)
      : defaultStateId;

    let parentIssue;
    if (existingParent && !update) {
      // Skip existing issue
      log.warn(`Skipped (exists): ${existingParent.identifier} - ${issue.title}`);
      skippedIssues.push(existingParent);
      parentIssue = existingParent;
    } else if (existingParent && update) {
      // Update existing issue
      const updateInput = {};
      if (issue.description) {
        updateInput.description = issue.description;
      }
      if (parentLabelIds.length > 0) {
        updateInput.labelIds = parentLabelIds;
      }
      if (parentStateId) {
        updateInput.stateId = parentStateId;
      }

      if (dryRun) {
        log.dim(`[dry-run] Would update: ${existingParent.identifier} - ${issue.title}`);
        parentIssue = existingParent;
      } else {
        parentIssue = await updateIssue(existingParent.id, updateInput, apiKey);
        log.success(`Updated: ${parentIssue.identifier} - ${parentIssue.title}`);
      }
      updatedIssues.push(parentIssue);
    } else {
      // Build parent issue input
      const parentInput = buildIssueInput(
        issue,
        team.id,
        project?.id,
        parentLabelIds,
        parentStateId
      );

      // Create parent issue
      if (dryRun) {
        log.dim(`[dry-run] Would create: ${issue.title}`);
        parentIssue = { id: 'dry-run-id', identifier: 'DRY-1', title: issue.title, url: '#' };
      } else {
        parentIssue = await createIssue(parentInput, apiKey);
        log.success(`Created: ${parentIssue.identifier} - ${parentIssue.title}`);
        // Add to existing issues for sub-issue duplicate checking
        existingIssues.push(parentIssue);
      }

      createdIssues.push(parentIssue);
    }

    // Process sub-issues
    if (issue.subIssues && issue.subIssues.length > 0) {
      for (const subIssue of issue.subIssues) {
        // Check for existing sub-issue (by identifier or title under parent)
        const existingSub = findExistingIssue(subIssue, parentIssue.id);

        // Resolve labels for sub-issue
        const subLabels = subIssue.labels || [];
        const subLabelIds = await resolveLabelIds(
          subLabels,
          team.id,
          existingLabels,
          apiKey,
          dryRun
        );

        // Resolve status (use sub-issue status or fall back to default)
        const subStateId = subIssue.status
          ? resolveStatusId(subIssue.status, workflowStates)
          : defaultStateId;

        if (existingSub && !update) {
          // Skip existing sub-issue
          log.warn(`  Skipped (exists): ${existingSub.identifier} - ${subIssue.title}`);
          skippedIssues.push(existingSub);
          continue;
        } else if (existingSub && update) {
          // Update existing sub-issue
          const updateInput = {};
          if (subIssue.description) {
            updateInput.description = subIssue.description;
          }
          if (subLabelIds.length > 0) {
            updateInput.labelIds = subLabelIds;
          }
          if (subStateId) {
            updateInput.stateId = subStateId;
          }
          // Update parent if different (reparenting)
          if (parentIssue.id && existingSub.parent?.id !== parentIssue.id) {
            updateInput.parentId = parentIssue.id;
          }

          if (dryRun) {
            const reparentNote =
              updateInput.parentId && existingSub.parent?.id !== parentIssue.id
                ? ` (reparent to ${parentIssue.identifier})`
                : '';
            log.dim(
              `  [dry-run] Would update sub-issue: ${existingSub.identifier} - ${subIssue.title}${reparentNote}`
            );
          } else {
            const updated = await updateIssue(existingSub.id, updateInput, apiKey);
            log.success(`  Updated: ${updated.identifier} - ${updated.title}`);
          }
          updatedIssues.push(existingSub);
          continue;
        }

        // Build sub-issue input with parent ID
        const subInput = buildIssueInput(
          subIssue,
          team.id,
          project?.id,
          subLabelIds,
          subStateId,
          dryRun ? null : parentIssue.id
        );

        // Create sub-issue
        if (dryRun) {
          log.dim(`  [dry-run] Would create sub-issue: ${subIssue.title}`);
          createdIssues.push({
            id: 'dry-run-id',
            identifier: 'DRY-X',
            title: subIssue.title,
            url: '#',
          });
        } else {
          const created = await createIssue(subInput, apiKey);
          log.success(`  Created: ${created.identifier} - ${created.title}`);
          createdIssues.push(created);
          existingIssues.push({ ...created, parent: { id: parentIssue.id } });
        }
      }
    }
  }

  // Summary
  console.log('');
  log.info('='.repeat(50));
  if (dryRun) {
    log.warn(`Dry run complete. Would create ${createdIssues.length} issues.`);
    if (updatedIssues.length > 0) {
      log.warn(`Would update ${updatedIssues.length} existing issues.`);
    }
    if (skippedIssues.length > 0) {
      log.warn(`Would skip ${skippedIssues.length} existing issues.`);
    }
  } else {
    if (createdIssues.length > 0) {
      log.success(`Created ${createdIssues.length} issues.`);
    }
    if (updatedIssues.length > 0) {
      log.success(`Updated ${updatedIssues.length} issues.`);
    }
    if (skippedIssues.length > 0) {
      log.warn(`Skipped ${skippedIssues.length} existing issues.`);
    }
    if (createdIssues.length > 0) {
      console.log('');
      log.info('Created issues:');
      for (const issue of createdIssues) {
        console.log(`  ${issue.identifier}: ${issue.url}`);
      }
    }
    if (updatedIssues.length > 0) {
      console.log('');
      log.info('Updated issues:');
      for (const issue of updatedIssues) {
        console.log(`  ${issue.identifier}: ${issue.url || '#'}`);
      }
    }
  }

  return createdIssues;
}
