export function patchStyle(el, prev, next) {
  const style = el.style

  //老的没有，新的有 添加新的
  for (const key in next) {
    style[key] = next[key]
  }

  //新的没有，老的有 删除老的
  for (const key in prev) {
    if (next[key] === null) {
      style[key] = null
    }
  }
}
