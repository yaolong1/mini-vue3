
//更新Class
export function patchClass(el, value) {
  // 为空删class属性
  if (value == null) {
    el.removeAttribute('class')
  } else {
    el.className = value
  }
}
