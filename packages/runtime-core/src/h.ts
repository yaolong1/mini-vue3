import { isObject, isArray } from '@mini-vue3/shared';
import { createVNode, isVNode } from './createVNode';
export function h(type, propsOrChildren, children) {
  // 两个参数
  // 写法1 h('div',{})
  // 写法2 h('div',h('span'))
  // 写法3 h('div','he')
  // 写法4 h('div',['he'])


  // 三个参数
  // 写法1 h('div',{},'孩子')
  // 写法1 h('div',{},h())
  // 写法2 h('div',{},['孩子','孩子'，'孩子'])


  // 获取当前方法参数的长度
  let l = arguments.length;

  //两个参数
  if (l === 2) {
    //是对象不是数组
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      //是虚拟节点-> children
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren])
      }
      //是普通对象-> props
      return createVNode(type, propsOrChildren)

      //是数组 -> children
    } else {
      return createVNode(type, null, propsOrChildren)
    }

    //三个或以上
  } else {
    if (l > 3) {
      //截取两个参数之后的参数作为children
      children = Array.prototype.slice.call(arguments, 2)
    } else if (l === 3 && isVNode(children)) {
      children = [children]
    }
    return createVNode(type, propsOrChildren, children)
  }



}