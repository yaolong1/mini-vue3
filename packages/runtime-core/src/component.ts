import { shallowReadonly } from "@mini-vue3/reactivity"
import { isFunction, isObject } from "@mini-vue3/shared"
import { emit } from "./componentEmits"
import { initProps } from "./componentProps"
import { PublicInstanceProxyHandler } from "./componentPublicInstance"
import { initSlots } from "./componentSlots"


export function createComponentInstance(vnode) {
  const type = vnode.type // 用户自己传入的属性
  const data = (type.data && isFunction(type.data) ? type.data() : type.data) || {}
  const instance = {
    vnode, // 实例对应的虚拟节点
    type, // 组件对象
    subTree: null, // 组件渲染完成后返回的内容  vnode
    ctx: {}, // 组件的上下文
    props: {}, // 组件属性 //组件中定义了的propsOptions叫做props
    attrs: {}, // 除了props中的属性 //没定义的叫attrs
    slots: {}, // 组件的插槽
    data, //data响应式对象
    update: () => { },
    setupState: {}, // 组件中setup的返回值 {方法，属性} 
    propsOptions: type.props || {}, // 组件中的props选项 const component = {props:{title:{type:String,default:'xxx'}}}
    proxy: null, // 实例的代理对象  
    render: null, // 组件的渲染函数
    emit: null, // 事件的触发
    exposed: {}, // 暴露的方法
    isMounted: false // 是否被挂载完成
  }

  instance.ctx = { _: instance } // 后续会对它进行代理
  instance.emit = emit.bind(null, instance)
  return instance
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
 * 这个方法的作用就是调用setup函数,拿到返回值 赋值给instance.setupState 或者是赋值instance.render
 * setup有可能返回 h(),也有可能返回一个{}
 * @param instance 
 */
export function setupStatefulComponent(instance) {
  const Component = instance.type
  const { setup, render } = Component

  // 创建一个代理对象来聚合所有响应式的对象
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandler)
  if (setup) {
    const setupContext = createSetupContext(instance)
    //setup()返回值有两种情况，有可能返回 h() ==》vnode,也有可能返回一个{} ==> setupState

    //setup中的props是只读的
    let setupResult = setup(shallowReadonly(instance.props), setupContext)

    //如果setup是函数就是一个render()
    if (isFunction(setupResult)) {
      if (render) console.error('setup返回渲染函数,忽略render函数')
      instance.render = setupResult
      // 如果是对象就是setupState
    } else if (isObject(setupResult)) {
      instance.setupState = setupResult
    }
  }

  // 如果执行完setup发现没有instance.render或者setup是空的,
  if (!instance.render) {
    // 执行组件的render并值给instance.render
    instance.render = render

    // 如果组件也没有写render函而是写的template => 就要执行模板编译把template编译成render函数
    //TODO
  }
  console.log('初始化setup', instance)
}



export function setupComponent(instance) {
  // 组件的虚拟节点
  const { props, children } = instance.vnode

  // 组件的props初始化、 attrs初始化、data初始化
  initProps(instance, props)
  // 插槽初始化
  //TODO
  initSlots(instance, children)

  // 初始化setup
  setupStatefulComponent(instance)
}

