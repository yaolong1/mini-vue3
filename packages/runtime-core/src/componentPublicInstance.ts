import { hasOwn } from "@mini-vue3/shared"
import { ComponentInternalInstance } from "./component";


export interface ComponentRenderContext {
  [key: string]: any
  _: ComponentInternalInstance
}


const publicPropertiesMap = {
  // i为组件实例对象
  $el: (i) => i.vnode.el,
  $emit: (i) => i.emit,
  $slots: (i) => i.slots,
  $props: (i) => i.props,
  $attrs: (i) => i.attrs,
};

// render(){}上下文代理对象处理
export const PublicInstanceProxyHandler = {
  get({ _: instance } : ComponentRenderContext, key) {
    const { setupState, props, data } = instance
    if (key.startsWith('$')) {
      return (publicPropertiesMap[key] && publicPropertiesMap[key](instance))
    } else {
      //如果在render函数中使用proxy.key调用某个setupState, props
      // 根据当前的key，断是否在setupState中还是props中，如果在就直接返回key对应的setupState或props
      if (hasOwn(setupState, key)) {
        return setupState[key]
      } else if (hasOwn(data, key)) {
        return data[key]
      } else if (hasOwn(props, key)) {
        return props[key]
      } else {
        // console.log('我是其他情况 proxy--get当前key=', key)
        console.error('没找到当前key', key)
      }
    }
  },
  set({ _: instance }, key, value) {
    const { setupState, props, data } = instance
    // 分别设置值，props在组件中是只读的
    if (hasOwn(setupState, key)) {
      setupState[key] = value
    } else if (hasOwn(data, key)) {
      data[key] = value
    } else if (hasOwn(props, key)) {
      console.warn('Props are readonly')
      return false
    } else {
      // console.log('我是其他情况proxy--set当前key=', key)
      console.error('没找到当前key', key)
    }
    return true
  },
}