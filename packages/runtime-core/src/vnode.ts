import { isArray, isFunction, ShapeFlags, isObject, isString } from '@mini-vue3/shared';
import { ComponentInternalInstance } from './component';



export interface VNode {
  __v_isVNode: boolean,
  type: any,
  props: any,
  children: any,
  key: string | number | symbol | null,
  component: ComponentInternalInstance | null,
  el: any,
  shapeFlag: number
}

/**
 * 创建虚拟节点
 * @param type 
 * @param props 
 * @param children  
 */
export function createVNode(type, props = null, children = null) {

  // 描述虚拟节点的类型
  const shapeFlag =
    isObject(type)
      ? ShapeFlags.STATEFUL_COMPONENT
      : isString(type)
        ? ShapeFlags.ELEMENT
        : isFunction(type)
          ? ShapeFlags.FUNCTIONAL_COMPONENT
          : 0
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

  normalizeChildren(vnode, children)

  // vnode.shapeFlag |= (children && isArray(children)) ? ShapeFlags.ARRAY_CHILDREN : isString(children) ? ShapeFlags.TEXT_CHILDREN : 0
  return vnode
}

export const isVNode = (val) => val && !!val.__v_isVNode

export const isSameVNodeType = (n1, n2) => n1.type === n2.type && n1.key === n2.key

export function normalizeChildren(vnode, children) {
  let type = 0
  const { shapeFlag } = vnode
  if (children === null) {
    children = null
  } else if (isArray(children)) {
    //孩子为数组
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (isObject(children)) {
    //孩子为对象说明是插槽，因为h函数已经对children进行规范化，单个虚拟节点也会变成一个数组，所以当children为对象时即为插槽
    if (shapeFlag & ShapeFlags.ELEMENT) {

    } else {
      type = ShapeFlags.SLOTS_CHILDREN
    }
  } else if (isFunction(children)) {
    debugger
    //孩子为函数说明是默认插槽
    type = ShapeFlags.SLOTS_CHILDREN
    children = { default: children }
  } else {
    //孩子为文本
    children = String(children)
    type = ShapeFlags.TEXT_CHILDREN
  }

  vnode.children = children
  //合并权限
  vnode.shapeFlag |= type
}

// 将h('xx',{},['s','b']) 孩子是字符的转为VNode的格式 正规化一下方便后续操作
export const Text = Symbol()
//注释节点
export const Comment = Symbol()
//碎片
export const Fragment = Symbol()

export const normalizeVNode = (child) => {
  if (child === null) {
    //如果为空则为注释节点
    return createVNode(Comment)
  } else if (isArray(child)) {
    return createVNode(Fragment, null, child.slice())
  } else if (isObject(child)) {
    return child
  }
  return createVNode(Text, null, String(child))
}