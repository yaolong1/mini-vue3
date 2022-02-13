import { ReactiveEffect } from './../../reactivity/src/effect';
import { reactive } from '@mini-vue3/reactivity';
import { ShapeFlags } from '@mini-vue3/shared';
// 主要是一些与平台无关的代码，依赖响应式模块 (平台相关的代码一般只是传入runtime-core Api中)

import { createAppAPI } from './apiCreateAppAPI'
import { createComponentInstance, setupComponent } from './component';


/**
 * 创建一个渲染器
 * @param renderOptions // 第三方平台的api选项 
 * @returns {render,createApp()}
 */
export function createRenderer(renderOptions) {

  // 调用render函数用 把render函数放进ReactiveEffect中
  const setupRenderEffect = (initialVNode, instance, container) => {
    console.log('初始化调用render')
    // 创建渲染effect
    // 核心是调用render, 数据发生变化就会重新调用render
    const componentUpdateFn = () => {
      const { proxy } = instance

      if (!instance.isMounted) {
        // 初次挂载 会调用render方法
        // 渲染页面的时候响应式对象会取值,取值的时候会进行依赖收集 收集对应的effect
        // 当渲染完成之后，如果数据发生了改变会再次执行当前方法
        const subTree = instance.subTree = instance.render.call(proxy, proxy) //渲染调用h方法
        instance.isMounted = true
      } else {
        // 组件更新
      }
    }

    const effect = new ReactiveEffect(componentUpdateFn)
    // 调用update方法就会执行 componentUpdateFn
    const update = effect.run.bind(effect)
    update()
    return
  }

  // 组件的挂载流程
  const mountComponent = (initialVNode, container) => {
    // 将组件的vnode渲染到容器中

    // 1、给组件创造一个组件实例 
    const instance = initialVNode.component = createComponentInstance(initialVNode)
    // 2、给组件的实例进行赋值
    setupComponent(instance)
    // 3、调用render方法实现组件的渲染逻辑（首次渲染即需要render函数中所有依赖的响应式对象 =>依赖收集）
    // 这里就会使用reactiveEffect，因为视图和数据时双向绑定的 数据变->视图变
    setupRenderEffect(initialVNode, instance, container)
  }

  const processComponent = (n1, n2, container) => {
    if (n1 == null) {
      //组件的挂载
      mountComponent(n2, container)
    } else {
      //组件的更新
    }
  }

  /**
   * 
   * @param n1 老vnode
   * @param n2 新vnode
   * @param container 挂载的容器
   */
  const patch = (n1, n2, container) => {
    if (n1 == n2) return; //新老节点相同不需要更新

    const { shapeFlag } = n2
    if (shapeFlag & ShapeFlags.COMPONENT) { //如果当前是一个组件的vnode
      processComponent(n1, n2, container)
    }
  }



  const render = (vnode, container) => { //将虚拟节点转化为真实节点渲染到容器中
    patch(null, vnode, container) // patch(prevNode,nextNode,真实节点)
  }

  return {
    createApp: createAppAPI(render),
    render
  }

}


export { h } from './h'

export * from '@mini-vue3/reactivity'