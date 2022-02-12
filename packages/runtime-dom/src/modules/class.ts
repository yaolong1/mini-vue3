
//更新Class
export function patchClass(el, value) {
  const style = el.class
  // 为空删class属性
  if (value == null) {
    el.removeAttribute('class')
  } else {
    el.className = value
  }
}
