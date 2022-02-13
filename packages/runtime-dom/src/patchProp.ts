//更新浏览器标签属性的操作

import { patchAttr } from "./modules/attrs"
import { patchClass } from "./modules/class"
import { patchEvent } from "./modules/events"
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
  } else {
    //其他属性
    //setAttribute() removeAttribute()
    patchAttr(el, key, nextValue)
  }
}




