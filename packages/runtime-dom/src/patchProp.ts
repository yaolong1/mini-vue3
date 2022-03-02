//更新浏览器标签属性的操作

import { patchAttr } from "./modules/attrs"
import { patchClass } from "./modules/class"
import { patchEvent } from "./modules/events"
import { patchDOMProp } from "./modules/props"
import { patchStyle } from "./modules/styles"

//diff算法要用到来对比标签的属性
/**
 * 
 * @param el 哪个el上的属性
 * @param key patch的属性key
 * @param prevValue 旧值
 * @param nextValue 新值
 */
export const patchProp = (el, key, prevValue, nextValue) => {
  if (key === 'class') {
    //类变化的对比
    patchClass(el, nextValue)
  } else if (key === 'style') {
    //样式变换的对比
    patchStyle(el, prevValue, nextValue)
  } else if (/^on[^a-z]/.test(key)) {
    //事件的监听
    patchEvent(el, key, nextValue)

    //DOM properties
  } else if (shouldSetAsProps(el, key, nextValue)) {
    patchDOMProp(el, key, nextValue)
  } else {
    //其他属性
    //setAttribute() removeAttribute()
    patchAttr(el, key, nextValue)
  }
}


//判断当前的key(属性)是否作为DOM Properties上设置 ,因为有些DOM Properties是只读的不允许设置所以我们要区分开设置
function shouldSetAsProps(el, key, value) {

  //eg: form属性是只读的如果通过 el.form = 'form1'会报错,所以就需要使用el.setAttribute('from','from1')来设置
  if (key === 'form') {
    return false
  }

  return key in el

}



