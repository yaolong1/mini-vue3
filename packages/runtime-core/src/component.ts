import { isPromise } from './../../shared/src/index';
import { VNode } from './vnode';
import { proxyRefs, shallowReadonly } from "@mini-vue3/reactivity"
import { isFunction, isObject, ShapeFlags } from "@mini-vue3/shared"
import { enableTracking, pauseTracking } from "packages/reactivity/src/effect"
import { emit } from "./componentEmits"
import { initProps } from "./componentProps"
import { PublicInstanceProxyHandler } from "./componentPublicInstance"
import { initSlots, InternalSlots } from "./componentSlots"
import { CompilerOptions } from '@mini-vue3/compiler-core';

//生命周期枚举
export const enum LifecycleHooks {
  BEFORE_CREATE = 'bc',
  CREATED = 'c',
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u',
  BEFORE_UNMOUNT = 'bum',
  UNMOUNTED = 'um',
  DEACTIVATED = 'da',
  ACTIVATED = 'a',
  RENDER_TRIGGERED = 'rtg',
  RENDER_TRACKED = 'rtc',
  ERROR_CAPTURED = 'ec',
  SERVER_PREFETCH = 'sp'
}

export interface RuntimeCompilerOptions {
  isCustomElement?: (tag: string) => boolean
  whitespace?: 'preserve' | 'condense'
  comments?: boolean
  delimiters?: [string, string]
}

export type Data = Record<string, unknown>

export type Component = ComponentOptions | FunctionalComponent

export type ComponentOptions = baseComponentOptions

export interface FunctionalComponent {
  (props: Data, ctx: Omit<SetupContext, 'expose'>): any
  props?: Data
  emits?: string[]
}

export interface baseComponentOptions {
  name?: string,
  setup?: (this, props, ctx: SetupContext) => any,
  render?: (this, props, setup, data, options) => any,
  props?: Data,
  template?: string | object,
  emits: string[],
  expose?: string[]
  components?: Record<string, Component>,
  compilerOptions?: RuntimeCompilerOptions
}


export interface SetupContext {
  attrs: Data,
  slots: any,
  emit: any,
  expose: (exposed) => any
}
export interface ComponentInternalInstance {
  next: VNode | null,//组件要更新的节点
  vnode: VNode | null, // 实例对应的虚拟节点
  type: any, // 组件对象
  subTree: any, // 组件渲染完成后返回的内容  vnode
  ctx: Data, // 组件的上下文
  props: Data, // 组件属性 //组件中定义了的propsOptions叫做props
  attrs: Data, // 除了props中的属性 //没定义的叫attrs
  slots: InternalSlots, // 组件的插槽
  data: Data, //data响应式对象
  update: Function,//当前实例的effectRunner
  setupState: Data, // 组件中setup的返回值 {方法，属性} 
  propsOptions: Object, // 组件中的props选项 const component = {props:{title:{type:String,default:'xxx'}}}
  proxy: any, // 实例的代理对象  
  render: Function, // 组件的渲染函数
  emit: Function, // 事件的触发
  exposed: Object, // 暴露的方法
  isMounted: boolean, // 是否被挂载完成
  bm: Function[] | null,//beforeMounted
  m: Function[] | null,//mounted
  bu: Function[] | null,//beforeUpdate
  u: Function[] | null,//updated
  um: Function[] | null,//unmount
  bum: Function[] | null,//beforeUnmount
}

export function createComponentInstance(vnode) {
  const type = vnode.type // 用户自己传入的属性
  const data = (type.data && isFunction(type.data) ? type.data() : type.data) || {}
  const instance: ComponentInternalInstance = {
    vnode, // 实例对应的虚拟节点
    type, // 组件对象
    subTree: null, // 组件渲染完成后返回的内容  vnode
    ctx: {}, // 组件的上下文
    props: {}, // 组件属性 //组件中定义了的propsOptions叫做props
    attrs: {}, // 除了props中的属性 //没定义的叫attrs
    slots: {}, // 组件的插槽
    next: null,
    data, //data响应式对象
    update: () => { },//当前实例的effectRunner
    setupState: {}, // 组件中setup的返回值 {方法，属性} 
    propsOptions: type.props || {}, // 组件中的props选项 const component = {props:{title:{type:String,default:'xxx'}}}
    proxy: null, // 实例的代理对象  
    render: null, // 组件的渲染函数
    emit: null, // 事件的触发
    exposed: {}, // 暴露的方法
    isMounted: false, // 是否被挂载完成
    bm: null,//beforeMounted
    m: null,//mounted
    bu: null,//beforeUpdate
    u: null,//updated
    um: null,//unmount
    bum: null,//beforeUnmount
  }

  instance.ctx = { _: instance } // 后续会对它进行代理
  instance.emit = emit.bind(null, instance)
  return instance
}


//是否是有状态的组件
const isStatefulComponent = (instance) => {
  return instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
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
export function setupStatefulComponent(instance, isSSR = false) {
  const Component = instance.type
  const { setup } = Component

  // 创建一个代理对象来聚合所有响应式的对象
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandler)
  if (setup) {
    const setupContext = createSetupContext(instance)
    //setup()返回值有两种情况，有可能返回 h() ==》vnode,也有可能返回一个{} ==> setupState

    //setup中的props是只读的
    pauseTracking() // 暂停收集依赖，setup中的

    //设置当前实例
    setCurrentInstance(instance)
    const setupResult = setup(shallowReadonly(instance.props), setupContext)
    setCurrentInstance(null)

    enableTracking()

    if (isPromise(setupResult)) {
      if (isSSR) {
        //异步 
        return setupResult.then((resolvedResult) => handleSetupResult(instance, resolvedResult, isSSR))
      }
    } else {
      handleSetupResult(instance, setupResult, isSSR)
    }
  } else {
    finishComponentSetup(instance, isSSR)
  }
  console.log('初始化setup', instance)
}


function handleSetupResult(instance, setupResult, isSSR = false) {

  const { render } = instance.type
  //如果setup是函数就是一个render()
  if (isFunction(setupResult)) {

    //TODO 这里在vue3源码中会判断当前环境是否是SSR环境，如果是SSR环境则设置 instance.ssrRender = setupResult

    // if (__SSR__ && (instance.type as ComponentOptions).__ssrInlineRender) {
    //当函数名是' ssrRender '(由SFC内联模式编译)，  
    //将其设置为ssrRender。
    //   instance.ssrRender = setupResult
    // } 

    if (render) console.warn('setup返回渲染函数,忽略render函数')
    instance.render = setupResult
    // 如果是对象就是setupState
  } else if (isObject(setupResult)) {
    //proxyRefs用于把ref单值响应式.value去掉
    instance.setupState = proxyRefs(setupResult)
  }

  finishComponentSetup(instance, isSSR)
}



//组件安装完成的处理
function finishComponentSetup(instance, isSSR) {

  const Component = instance.type
  const { render } = Component

  // 如果执行完setup发现没有instance.render或者setup是空的,
  if (!instance.render) {
    // 执行组件的render并值给instance.render
    instance.render = render

    // 如果组件也没有写render函而是写的template => 就要执行模板编译把template编译成render函数
    //如果当前是SSR服务端渲染直接跳过
    if (!render && !isSSR) {

      //如果组件选项存在template,调用编译器生成render函数
      if (compile && Component.template) {
        instance.render = compile(Component.template, {}, Component.isGlobal)
        //Component.isGlobal这个是我自己加的一个变量，为了区分当前引入mini-vue3的环境
      }
    }
    //TODO
  }
}

//导出当前setup是否是在ssr状态下
export let isInSSRComponentSetup = false


export function setupComponent(instance, isSSR = false) {

  //在执行setup之前设置当前的组件是否是ssr状态,默认是false
  isInSSRComponentSetup = isSSR

  //是否是有状态的组件
  const isStateful = isStatefulComponent(instance)

  // 组件的虚拟节点
  const { props, children } = instance.vnode
  // 组件的props初始化、 attrs初始化、data初始化
  initProps(instance, props, isStateful, isSSR)
  // 插槽初始化
  initSlots(instance, children)

  // 如果是普通组件就初始化setup
  const setupResult = isStateful
    ? setupStatefulComponent(instance, isSSR)
    : undefined

  //setup执行完毕后将组件setup状态设置为false
  isInSSRComponentSetup = false
  return setupResult
}


//获取组件名称
export function getComponentName(
  component
) {
  return isFunction(component) ? component.displayName || component.name : component.name
}


//全局变量，用于保存当前正在初始化的组件实例
export let currentInstance

export function setCurrentInstance(instance) {
  currentInstance = instance
}

export function getCurrentInstance() {
  return currentInstance
}

type CompileFunction = (
  template: string | object,
  options?: CompilerOptions,
  isGlobal?: boolean
) => any

let compile: CompileFunction

//注册运行时的编译器
export function registerRuntimeCompiler(_compile: any) {
  compile = _compile
}