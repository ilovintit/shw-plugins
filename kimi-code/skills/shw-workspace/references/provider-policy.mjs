/** Pure routing of already observed workspace evidence, not a lock or authentication system. */
export function resolveWorkspace(record) {
  if (!record || record.operation !== 'write') return { action: 'read-only' };
  const stop = reason => ({ action: 'blocked', reason });
  if (!record.repository || !record.task || !record.sourceBranch) return stop('missing-task-route');
  if (record.existingClaim === 'other' || record.activeWriter === 'other') return stop('occupied');
  if (record.unknownChanges || record.ownership === 'unknown') return stop('preserve-unknown-state');
  // An unavailable owner must be reconciled; another provider cannot bypass its claim.
  if (record.existingClaim === 'unresolved' || record.ownerUnavailable) return stop('reconcile-owner');
  if (record.provider === 'worktree' && record.available) {
    return { action: 'acquire-or-reuse', provider: 'worktree', task: record.task, sourceBranch: record.sourceBranch };
  }
  if (record.provider === 'host' && record.available && record.isolated === true &&
      record.ownership === 'self' && record.exclusive === true &&
      record.pathVerified === true && record.branchVerified === true &&
      typeof record.evidence === 'string' && record.evidence.trim()) {
    return { action: 'reuse', provider: 'host', task: record.task, sourceBranch: record.sourceBranch };
  }
  return stop('ownership-or-provider-unavailable');
}
