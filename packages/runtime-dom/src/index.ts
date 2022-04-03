// 主要是一些与浏览器平台相关的代码（dom操作Api,属性操作的Api --->传入runtime-core），依赖runtime-core


import { createHydrationRenderer, createRenderer } from '@mini-vue3/runtime-core';
import { extend, isString } from '@mini-vue3/shared';
// 渲染页面需要操作节点的代码
import { nodeOps } from './nodeOps';
import { patchProp } from './patchProp';


const rendererOptions = extend(nodeOps, { patchProp }) //浏览器平台渲染包含的所有api

// lazy创建渲染器-这使得核心渲染器逻辑 tree-shaking
let renderer

let enabledHydration = false //是否启用客户端激活缓存


export function ensureRenderer() {
  return (
    renderer ||
    (renderer = createRenderer<Node, Element | ShadowRoot>(rendererOptions))
  )
}


export function ensureHydrationRenderer() {
  renderer = enabledHydration ? renderer : createHydrationRenderer(rendererOptions)
  enabledHydration = true
  return renderer
}


export function render(...args) {
  ensureRenderer().render(...args)
}


export function hydrate(...args) {
  ensureHydrationRenderer().hydrate(...args)
}

export const createApp = (rootComponent, rootProps = null) => {
  //创建一个渲染器 返回 createApp
  const { createApp } = ensureRenderer() //createRenderer 是runtime-core中的方法
  const app = createApp(rootComponent, rootProps)
  let { mount } = app // 获取core中app的mount
  app.mount = function (container) { //重新mount
    if (isString(container)) {
      container = rendererOptions.querySelector(container)
    }
    container.innerHTML = '' //清空根元素的children
    mount(container, false)
  }
  return app
}


//创建服务端渲染APP实例
export const createSSRApp = (rootComponent, rootProps = null) => {
  //创建一个渲染器 返回 createApp
  const { createApp } = ensureHydrationRenderer() //createRenderer 是runtime-core中的方法
  const app = createApp(rootComponent, rootProps)
  let { mount } = app // 获取core中app的mount
  app.mount = function (container) { //重新mount
    if (isString(container)) {
      container = rendererOptions.querySelector(container)
    }
    mount(container, true) //true表示开启客户端激活
  }
  return app
}


export * from '@mini-vue3/runtime-core'


export { Transition } from './component/Transition'

