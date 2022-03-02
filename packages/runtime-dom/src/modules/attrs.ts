//更新属性
export function patchAttr(el, key, value) {
  if (value == null) {
    el.removeAttribute(key)
  } else {
    console.log('attr', value)
    el.setAttribute(key, value)
  }
}