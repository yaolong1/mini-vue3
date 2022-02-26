export const createDep = (effects?) => {
  const dep = new Set(effects)
  return dep
}