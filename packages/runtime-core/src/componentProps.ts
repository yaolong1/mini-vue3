import { reactive, shallowReactive } from "@mini-vue3/reactivity"
import { extend, isOn } from "@mini-vue3/shared"

/**
 * 初始化组件实例的props 主要是给实例中的props和attrs赋值
 * @param instance  组件实例
 * @param rawProps  传入的props =>const app = createApp(component,传入的props)
 * @param data  响应式对象
 * @param isSSR  是否是ssr环境
 */
export function initProps(instance, rawProps, isStateful, isSSR = false) {
  instance.data = reactive(instance.data)
  const { props, attrs } = resolveProps(instance.propsOptions, rawProps)

  if (isStateful) {
    //如果当前是ssr环境不需要创建响应式数据，因为ssr渲染的只是一个快照不需要响应式
    instance.props = isSSR ? props : shallowReactive(props)
  } else {
    //当前的组件是无状态的，是一个函数式组件，直接props == attrs
    instance.props = attrs
  }
  instance.attrs = attrs
}

/**
 * 解析组件props参数、attrs参数
 * @param propsOptions 
 * @param rawProps 
 * @returns 
 */
export function resolveProps(propsOptions, rawProps) {
  /**
     * const 组件 = {
     *  props:{
     *    name:{}
     *  }
     * }
     * 
     * createApp(组件,{name:'xxx',id:'a'})
     * 
     * 其中name在组件中的props中定义了 所以是一个props
     * id没有在组件中定义所以是一个普通的属性attrs
     */


  const props = {} //组件中定义了的props 
  const attrs = {} //组件中未定义了的props

  //找到组件中定义的属性key //可能还要类型的校验
  const options = propsOptions && Object.keys(propsOptions)
  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key]
      //事件、响应式对象赋值到props中
      if (options.includes(key) || isOn(key)) {
        props[key] = value
      } else {
        attrs[key] = value
      }
    }
  }

  return {
    props: props,
    attrs
  }
}