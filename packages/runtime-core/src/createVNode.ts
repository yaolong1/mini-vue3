import { isArray } from '@mini-vue3/shared';
import { isObject, isString, ShapeFlags } from '@mini-vue3/shared';

/**
 * 创建虚拟节点
 * @param type 
 * @param props 
 * @param children 
 */
export function createVNode(type, props, children = null) {


  // 描述虚拟节点的类型
  const shapeFlag = isObject(type) ? ShapeFlags.COMPONENT : isString(type) ? ShapeFlags.ELEMENT : 0

  const vnode = { //跨平台的
    __v_isVNode: true,
    type, //组件、或者元素 
    props,
    children,
    key: props && props.key,
    component: null, //如果当前的当前的vnode是一个组件，应当保存当前组件的实例
    el: null, //虚拟节点对应的虚拟节点
    shapeFlag // 可以同时描述虚拟节点的类型和它孩子节点的类型 (使用 | & )
  }
  // 合并当前节点的孩子节点是什么类型
  // 方便在渲染的时候使用 & 运算来检查是否存在什么样的孩子节点，什么样的节点类型
  vnode.shapeFlag |= (children && isArray(children)) ? ShapeFlags.ARRAY_CHILDREN : isString(children) ? ShapeFlags.TEXT_CHILDREN : 0
  return vnode
}

export const isVNode = (val) => !!val.__v_isVNode