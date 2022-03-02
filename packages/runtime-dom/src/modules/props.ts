import { includeBooleanAttr } from "@mini-vue3/shared"


export function patchDOMProp(el, key, value) {

  //当前的属性在DomProperties中的类型
  const type = typeof el[key]
  console.log('prop', key)
  if (value === '' || value === null) {

    if (type === 'boolean') {
      //eg `<button disabled></button> => <button disabled=""></button> =>  <button :disabled="true"></button>` <button :disabled="false"></button> 等等
      //value是null、或者是''则默认为true否则为false
      el[key] = includeBooleanAttr(value)
      return

    } else if (type === 'string' && value === null) {
      // eg： <div :id="null" /> =><div :id="" /> 删除id
      el[key] = ''
      el.removeAttribute(key)
      return

    } else if (type === 'number') {
      // eg: <div :with="null">
      try {
        el[key] = 0 //会报错 某些属性的值必须大于0  eg:input.size = 0 ->input的 size是不允许为0的，所以要try catch屏蔽报错
      } catch { }
      el.removeAttribute(key)
      return
    }
  }

  try {
    el[key] = value //有些props设置值会报错
  } catch (e) { console.warn(e) }
}