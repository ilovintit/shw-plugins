// Four groups: common plus optional PROD/TEST/DEV/CI Harbor overrides.
export function resolveHarbor(env, group) {
  if (!['PROD','TEST','DEV','CI'].includes(group)) throw new Error('Unknown Harbor environment');
  const result = {};
  for (const field of ['ADDR','PROJECT','USERNAME','PASSWORD']) {
    const override = env[`${group}_HARBOR_${field}`];
    const value = override === undefined || override === '' ? env[`HARBOR_${field}`] : override;
    if (typeof value !== 'string' || !value.trim() || /[\r\n\0]/.test(value)) throw new Error(`Missing or invalid ${group}_HARBOR_${field} or HARBOR_${field}`);
    result[field] = value;
  }
  if (!/^[a-zA-Z0-9.-]+(?::[0-9]+)?$/.test(result.ADDR)) throw new Error('Harbor ADDR must be a host without protocol or path');
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(result.PROJECT)) throw new Error('Invalid Harbor project');
  return result;
}
export function fleetBranch(source) {
  const branches = {dev:'fleet/dev',test:'fleet/test',main:'fleet/prod'};
  if (!Object.hasOwn(branches,source)) throw new Error('Only merged business branches can publish Fleet declarations');
  return branches[source];
}
