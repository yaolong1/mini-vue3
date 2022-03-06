

/**
 * 比较参数是否改变
 * @param preProps 
 * @param nextProps 
 * @returns 
 */
export function hasPropsChanged(preProps, nextProps) {

  const preKeys = Object.keys(preProps)
  const nextKeys = Object.keys(nextProps)

  //长度不同则有变化
  if (preKeys.length !== nextKeys.length) return true

  //长度相等的情况，比较值是否相等
  for (let key in nextKeys) {
    if (preProps[key] !== nextProps[key]) return true
  }
  return false
}
