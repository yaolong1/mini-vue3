import { normalizeVNode } from './vnode';
import { isOn, ShapeFlags } from '@mini-vue3/shared';
import { Data } from './component';

export function shouldUpdateComponent(preVNode, nextVNode) {
  const { props: preProps } = preVNode
  const { props: nextProps } = nextVNode


  if (preVNode.children !== nextVNode.children) {
    return true
  }


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
  let fallthroughAttrs //继承的的attrs
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
    slots,
    inheritAttrs //是否使得子元素继承attrs
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

    //直接取attrs
    fallthroughAttrs = attrs
  } else {
    //函数式组件
    //返回的函数render
    const render = Component
    result = normalizeVNode(
      //函数也是有length属性的，指的是形参的个数：
      render.length > 1 ?
        render(props, { attrs, slots, emit }) : render(props, null)
    )

    //函数式组件,需要特殊处理，因为在initPros时options props
    fallthroughAttrs = Component.props ? attrs : getFunctionalFallthrough(attrs)
  }


  //如果组件选项设置了inheritAttrs!=false即允许属性继承
  if (fallthroughAttrs && inheritAttrs !== false) {
    //子节点合并attrs
    result.props = {
      ...result.props,
      ...fallthroughAttrs
    }
  }



  return result
}

const getFunctionalFallthrough = (attrs: Data): Data | undefined => {
  let res: Data | undefined
  for (const key in attrs) {
    if (key === 'class' || key === 'style' || isOn(key)) {
      ; (res || (res = {}))[key] = attrs[key]
    }
  }
  return res
}
