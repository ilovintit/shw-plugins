/** Pure integration decision policy. Evidence must be collected by the caller;
 * this module neither runs tests nor grants permission to merge or deploy. */
import { createHash } from 'node:crypto';
const required = (value, name) => { if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing ${name}`); return value; };
const evidenceKeys = ['testConfigRevision','environmentRevision','fixtureRevision','targetRevision','targetTree'];
const sorted = values => [...values].sort();
export function freezeCandidate(input) {
  for (const key of ['id', 'devSha', 'integrationHeadSha', 'mainBaseSha', 'tree', 'baselineRevision', 'candidateBaselineRevision']) required(input[key], key);
  for (const key of evidenceKeys) required(input[key], key);
  if (input.targetTree !== input.tree) throw new Error('Test target must match premerge tree');
  if (!Array.isArray(input.issues) || !input.issues.length || new Set(input.issues).size !== input.issues.length) throw new Error('Invalid issue scope');
  if (!Array.isArray(input.acceptances)) throw new Error('Missing human acceptance');
  if (!Array.isArray(input.requiredSuites) || !input.requiredSuites.length || input.requiredSuites.some(s => !['api','e2e','vrt','unit','contract'].includes(s)) || new Set(input.requiredSuites).size !== input.requiredSuites.length) throw new Error('Explicit applicable suites required');
  if (!Array.isArray(input.includedCommits)) throw new Error('Missing accepted commit ancestry evidence');
  const issues = sorted(input.issues.map(issue => required(issue, 'issue')));
  const acceptances = input.acceptances.map(a => {
    for (const key of ['issue', 'commit', 'digest', 'tree', 'buildInputs', 'evidence']) required(a[key], key);
    if (!issues.includes(a.issue) || a.accepted !== true) throw new Error('Invalid human acceptance');
    if (!input.includedCommits.includes(a.commit) || !Array.isArray(a.changedAssertions) || a.changedAssertions.some(v => typeof v !== 'string' || !v.trim())) throw new Error('Missing acceptance scope or commit ancestry');
    return {changedAssertions:sorted(a.changedAssertions),issue:a.issue, commit:a.commit, digest:a.digest, tree:a.tree, buildInputs:a.buildInputs, evidence:a.evidence, accepted:true};
  }).sort((a,b) => a.issue.localeCompare(b.issue));
  if (issues.some(issue => !acceptances.some(a => a.issue === issue))) throw new Error('Unaccepted issue scope');
  const result = {...Object.fromEntries(evidenceKeys.map(key => [key,input[key]])),requiredSuites:sorted(input.requiredSuites),includedCommits:sorted(input.includedCommits),integrationHeadSha:input.integrationHeadSha,candidateBaselineRevision:input.candidateBaselineRevision,id:input.id,devSha:input.devSha,mainBaseSha:input.mainBaseSha,tree:input.tree,baselineRevision:input.baselineRevision,issues,acceptances};
  return {...result, fingerprint:createHash('sha256').update(JSON.stringify(result)).digest('hex')};
}
export function assertCurrent(candidate, current) {
  if (freezeCandidate(candidate).fingerprint !== candidate.fingerprint || freezeCandidate(current).fingerprint !== candidate.fingerprint) throw new Error('Candidate changed: recompute and rerun');
}
export function classifyDifference(candidate, difference) {
  if (difference.blanketAccept || difference.deleteAssertions) throw new Error('Blanket acceptance or assertion removal forbidden');
  if (difference.kind === 'environment') return 'repair-environment-and-rerun';
  if (difference.kind === 'expected') {
    const acceptance = candidate.acceptances.find(a => a.issue === difference.issue && a.evidence === difference.acceptanceEvidence);
    if (!acceptance || !difference.assertions?.length || difference.assertions.some(a => typeof a !== 'string' || !a.trim()) || !difference.explanation || difference.assertions.some(a => !acceptance.changedAssertions.includes(a))) return 'investigate-and-fix';
    return 'update-scoped-candidate-and-rerun';
  }
  return 'investigate-and-fix';
}
export function checkCandidate(candidate, current, result) {
  assertCurrent(candidate, current);
  if (result.fingerprint !== candidate.fingerprint || result.tree !== candidate.tree || result.candidateBaselineRevision !== candidate.candidateBaselineRevision || !result.runId) throw new Error('Checks do not belong to candidate');
  for (const key of evidenceKeys) if (result[key] !== candidate[key]) throw new Error(`Stale or missing check evidence: ${key}`);
  for (const suite of candidate.requiredSuites) if (result.suites?.[suite] !== 'passed') throw new Error(`Required suite ${suite} not passed`);
  if (candidate.candidateBaselineRevision !== candidate.baselineRevision && result.baselineChanged !== true) throw new Error('Baseline revision changed without declared scoped rerun');
  if (result.baselineChanged && (!result.candidateOnly || !result.rerunAfterBaselineChange)) throw new Error('Baseline change requires candidate-only update and rerun');
  if (result.initialBaseline && (!result.scenariosPassed || !result.candidateOnly || !result.rerunAfterBaselineChange)) throw new Error('Initial baseline requires successful scenarios, accepted scope and rerun');
  return {fingerprint:candidate.fingerprint,tree:candidate.tree,candidateBaselineRevision:candidate.candidateBaselineRevision,runId:result.runId};
}
export function promoteBaseline(candidate, current, checked, merge) {
  assertCurrent(candidate,current);
  if (checked.fingerprint !== candidate.fingerprint || checked.tree !== candidate.tree || checked.candidateBaselineRevision !== candidate.candidateBaselineRevision || !checked.runId) throw new Error('Unchecked candidate');
  if (!merge.merged || merge.target !== 'main' || merge.tree !== candidate.tree || merge.firstParent !== candidate.mainBaseSha || merge.secondParent !== candidate.integrationHeadSha) throw new Error('Merge does not prove checked candidate');
  required(merge.commit,'main merge commit');
  if ([candidate.devSha,candidate.integrationHeadSha].includes(merge.commit)) throw new Error('Normal merge requires a distinct main commit');
  return {mainCommit:merge.commit,tree:merge.tree,baselineRevision:candidate.candidateBaselineRevision,candidate:candidate.fingerprint};
}
export function canReuseDigest(artifact, target) {
  return ['digest','sourceCommit','tree','buildInputs'].every(k => typeof artifact[k] === 'string' && artifact[k].length > 0)
    && typeof target.commit === 'string' && !!target.commit && artifact.tree === target.tree && artifact.buildInputs === target.buildInputs
    && (artifact.sourceCommit === target.commit || target.provenSourceCommit === artifact.sourceCommit);
}
