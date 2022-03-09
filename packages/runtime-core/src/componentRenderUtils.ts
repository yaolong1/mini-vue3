import { normalizeVNode } from './vnode';
import { ShapeFlags } from '@mini-vue3/shared';

export function shouldUpdateComponent(preVNode, nextVNode) {
  const { props: preProps } = preVNode
  const { props: nextProps } = nextVNode

  //完全相等不更新
  if (preProps === nextProps) {
    return false
  }

  //之前没有，现在有,有可能要更新，根据要更新的props来确认是否更新
  if (!preProps) {
    return !!nextProps
  }

  //之前有、现在没有,一定要更新
  if (!nextProps) {
    return true
  }

  //更细粒度的判断
  return hasPropsChanged(preProps, nextProps)
}

/**
 * 比较参数是否改变
 * @param preProps 
 * @param nextProps 
 * @returns 
 */
export function hasPropsChanged(preProps, nextProps) {

  const preKeys = Object.keys(preProps)
  const nextKeys = Object.keys(nextProps)

  //长度不同则有变化
  if (preKeys.length !== nextKeys.length) return true

  //长度相等的情况，比较值是否相等
  for (let key in nextKeys) {
    if (preProps[key] !== nextProps[key]) return true
  }
  return false
}


/**
 * 渲染组件
 * @param instance 
 */
export function renderComponentRoot(instance) {
  let result
  const {
    type: Component,
    vnode,
    render,
    proxy,
    props,
    setupState,
    data,
    ctx,
    attrs,
    emit,
    slots
  } = instance

  //如果是普通的状态组件
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    const proxyToUse = proxy
    result = normalizeVNode(
      render!.call(
        proxyToUse,
        proxyToUse!,
        props,
        setupState,
        data,
        ctx)
    )
  } else {
    //函数式组件
    //返回的函数render
    debugger
    const render = Component
    result = normalizeVNode(
      //函数也是有length属性的，指的是形参的个数：
      render.length > 1 ?
        render(props, { attrs, slots, emit }) : render(props, null)
    )
  }
  return result
}