/** Integration source/build policy. Tests and test baselines are independent records.
 * This module grants no permission to merge, deploy, publish or start tests. */
import {createHash} from 'node:crypto';
const required=(value,name)=>{if(typeof value!=='string'||!value.trim())throw new Error(`Missing ${name}`);return value;};
const sorted=values=>[...values].sort();
export function freezeCandidate(input) {
  for(const key of ['id','devSha','integrationHeadSha','mainBaseSha','tree','buildInputs']) required(input[key],key);
  if(input.authorized!==true) throw new Error('Missing authorized integration scope');
  if(!Array.isArray(input.issues)||!input.issues.length||new Set(input.issues).size!==input.issues.length) throw new Error('Invalid issue scope');
  if(!Array.isArray(input.includedCommits)||!input.includedCommits.includes(input.devSha)) throw new Error('Missing source commit ancestry');
  const issues=sorted(input.issues.map(issue=>required(issue,'issue')));
  // Optional human observations retain their exact source identity; lack of acceptance is not a gate.
  const acceptances=(input.acceptances??[]).map(a=>{
    for(const key of ['issue','commit','digest','tree','buildInputs','evidence']) required(a[key],key);
    if(!issues.includes(a.issue)||!input.includedCommits.includes(a.commit)||typeof a.accepted!=='boolean') throw new Error('Invalid observation scope');
    return {issue:a.issue,commit:a.commit,digest:a.digest,tree:a.tree,buildInputs:a.buildInputs,evidence:a.evidence,accepted:a.accepted};
  }).sort((a,b)=>a.issue.localeCompare(b.issue));
  const result={id:input.id,devSha:input.devSha,integrationHeadSha:input.integrationHeadSha,mainBaseSha:input.mainBaseSha,tree:input.tree,buildInputs:input.buildInputs,authorized:true,issues,includedCommits:sorted(input.includedCommits),acceptances};
  return {...result,fingerprint:createHash('sha256').update(JSON.stringify(result)).digest('hex')};
}
export function assertCurrent(candidate,current) {
  if(freezeCandidate(candidate).fingerprint!==candidate.fingerprint||freezeCandidate(current).fingerprint!==candidate.fingerprint) throw new Error('Candidate changed: refresh source/build evidence');
}
export function classifyDifference(candidate,difference) {
  if(difference.blanketAccept||difference.deleteAssertions) throw new Error('Blanket acceptance or assertion removal forbidden');
  if(difference.kind==='environment') return 'repair-environment';
  return 'investigate-and-fix';
}
export function checkCandidate(candidate,current,result) {
  assertCurrent(candidate,current);
  if(result.fingerprint!==candidate.fingerprint||result.tree!==candidate.tree||result.buildInputs!==candidate.buildInputs||!result.runId||result.sourceSHA!==candidate.integrationHeadSha) throw new Error('Build/source evidence does not belong to candidate');
  if(result.build!=='passed'||result.staticChecks!=='passed') throw new Error('Build/static checks not passed');
  // suites, test configuration, reruns and baseline records are deliberately outside this decision.
  return {fingerprint:candidate.fingerprint,tree:candidate.tree,buildInputs:candidate.buildInputs,sourceSHA:result.sourceSHA,runId:result.runId};
}
export function promoteCandidate(candidate,current,checked,merge) {
  assertCurrent(candidate,current);
  if(checked.fingerprint!==candidate.fingerprint||checked.tree!==candidate.tree||checked.buildInputs!==candidate.buildInputs||checked.sourceSHA!==candidate.integrationHeadSha||!checked.runId) throw new Error('Unchecked source/build candidate');
  if(!merge.merged||merge.target!=='main'||merge.tree!==candidate.tree||merge.firstParent!==candidate.mainBaseSha||merge.secondParent!==candidate.integrationHeadSha) throw new Error('Merge does not prove source/build candidate');
  required(merge.commit,'main merge commit');
  if([candidate.devSha,candidate.integrationHeadSha].includes(merge.commit)) throw new Error('Normal merge requires a distinct main commit');
  return {mainCommit:merge.commit,tree:merge.tree,candidate:candidate.fingerprint};
}
// Compatibility name only: integration never promotes a test baseline.
export const promoteBaseline=promoteCandidate;
export function canReuseDigest(artifact,target) {
  return ['digest','sourceCommit','tree','buildInputs'].every(k=>typeof artifact[k]==='string'&&artifact[k].length>0)
    && typeof target.commit==='string'&&!!target.commit&&artifact.tree===target.tree&&artifact.buildInputs===target.buildInputs
    && (artifact.sourceCommit===target.commit||target.provenSourceCommit===artifact.sourceCommit);
}
