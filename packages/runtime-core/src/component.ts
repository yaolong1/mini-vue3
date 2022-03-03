import { reactive } from "@mini-vue3/reactivity"
import { hasOwn, isFunction, isObject } from "@mini-vue3/shared"


export function createComponentInstance(vnode) {
  const type = vnode.type // 用户自己传入的属性

  const instance = {
    vnode, // 实例对应的虚拟节点
    type, // 组件对象
    subTree: null, // 组件渲染完成后返回的内容  vnode
    ctx: {}, // 组件的上下文
    props: {}, // 组件属性 //组件中定义了的propsOptions叫做props
    attrs: {}, // 除了props中的属性 //没定义的叫attrs
    slots: {}, // 组件的插槽
    setupState: {}, // 组件中setup的返回值 {方法，属性} 
    propsOptions: type.props || {}, // 组件中的props选项 const component = {props:{title:{type:String,default:'xxx'}}}
    proxy: null, // 实例的代理对象  
    render: null, // 组件的渲染函数
    emit: null, // 事件的触发
    exposed: {}, // 暴露的方法
    isMounted: false // 是否被挂载完成
  }

  instance.ctx = { _: instance } // 后续会对它进行代理

  return instance
}

//
/**
 * 初始化组件实例的props 主要是给实例中的props和attrs赋值
 * @param instance  组件实例
 * @param rawProps  传入的props =>const app = createApp(component,传入的props)
 */
export function initProps(instance, rawProps) {

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
  const options = Object.keys(instance.propsOptions)
  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key]
      if (options.includes(key)) {
        props[key] = value
      } else {
        attrs[key] = value
      }
    }
  }
  instance.props = reactive(props)
  instance.attrs = attrs //静态属性非响应式
  console.log('初始化props、attrs', instance)
}


//创建setup的上下文
function createSetupContext(instance) {
  return {
    attrs: instance.attrs,
    slots: instance.slots,
    emit: instance.emit,
    expose: (exposed) => instance.exposed = exposed || {}
  }
}


/**
 * 插槽初始化
 * @param instance 
 */
export function initSlots(instance, children) {
  //TODO
  console.log('初始化插槽 //TODO')
}



// render(){}上下文代理对象处理
const PublicInstanceProxyHandler = {
  get({ _: instance }, key) {
    const { setupState, props } = instance
    //如果在render函数中使用proxy.key调用某个setupState, props
    // 根据当前的key，断是否在setupState中还是props中，如果在就直接返回key对应的setupState或props
    if (hasOwn(setupState, key)) {
      return setupState[key]
    } else if (hasOwn(props, key)) {
      return props[key]
    } else {
      // 其他的情况如 $....
      console.log('我是其他情况 proxy--get当前key=', key)
    }
  },
  set({ _: instance }, key, value) {
    const { setupState, props } = instance
    // 分别设置值，props在组件中是只读的
    if (hasOwn(setupState, key)) {
      setupState[key] = value
    } else if (hasOwn(props, key)) {
      console.warn('Props are readonly')
      return false
    } else {
      console.log('我是其他情况proxy--set当前key=', key)
    }
    return true
  },
}

/**
 * 这个方法的作用就是调用setup函数,拿到返回值 赋值给instance.setupState 或者是赋值instance.render
 * setup有可能返回 h(),也有可能返回一个{}
 * @param instance 
 */
export function setupStatefulComponent(instance) {
  const Component = instance.type
  const { setup } = Component
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandler)
  if (setup) {
    const setupContext = createSetupContext(instance)
    //setup()返回值有两种情况，有可能返回 h() ==》vnode,也有可能返回一个{} ==> setupState
    let setupResult = setup(instance.props, setupContext)

    //如果setup是函数就是一个render()
    if (isFunction(setupResult)) {
      instance.render = setupResult
      // 如果是对象就是setupState
    } else if (isObject(setupResult)) {
      instance.setupState = setupResult
    }
  }

  // 如果执行完setup发现没有instance.render或者setup是空的,
  if (!instance.render) {
    // 执行组件的render并值给instance.render
    instance.render = Component.render

    // 如果组件也没有写render函而是写的template => 就要执行模板编译把template编译成render函数
    //TODO
  }
  console.log('初始化setup', instance)
}



export function setupComponent(instance) {
  // 组件的虚拟节点
  const { props, children } = instance.vnode

  // 组件的props初始化、 attrs初始化
  initProps(instance, props)
  // 插槽初始化
  //TODO
  initSlots(instance, children)

  // 初始化setup
  setupStatefulComponent(instance)
}

