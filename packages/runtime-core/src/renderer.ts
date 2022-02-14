import { isSameVNodeType, normalizeVNode, Text } from './createVNode';
import { ReactiveEffect } from '@mini-vue3/reactivity';
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

  //第三方平台的APi
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling
  } = renderOptions



  // 调用render函数用 把render函数放进ReactiveEffect中
  const setupRenderEffect = (initialVNode, instance, container) => {
    console.log('初始化调用render')
    // 创建渲染effect
    // 核心是调用render, 数据发生变化就会重新调用render
    const componentUpdateFn = () => {
      const { proxy, attrs } = instance

      if (!instance.isMounted) {
        // 初次挂载 会调用render方法
        // 渲染页面的时候响应式对象会取值,取值的时候会进行依赖收集 收集对应的effect
        // 当渲染完成之后，如果数据发生了改变会再次执行当前方法
        const subTree = instance.subTree = instance.render.call(proxy, proxy) //渲染调用h方法

        // 真正开始渲染组件 即渲染subTree //前面的逻辑其实就是为了得到suTree,初始化组件实例为组件实例赋值之类的操作
        patch(null, subTree, container)
        initialVNode.el = subTree.el
        instance.isMounted = true
      } else {
        // 组件更新
        //diff算法 比较两课前后的树 更新\删除
        console.log('组件更新逻辑')
        const prevTree = instance.subTree
        const nextTree = instance.render.call(proxy, proxy)
        patch(prevTree, nextTree, container)
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
      console.log('组件 更新')
    }
  }



  /**
   * 挂载孩子
   * @param container 
   * @param children 
   */
  const mountChildren = (container, children) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i] = normalizeVNode(children[i])
      patch(null, child, container)
    }
  }

  /**
   * 挂载元素
   * @param vnode 挂载的虚拟DOM
   * @param container 
   */
  const mountElement = (vnode, container) => {
    // vnode中的children永远只有两种情况：数组、字符串
    // 如果vnode的children是一个对象或vnode则要被h函数转化为数组
    // 所以children只有字符串和数组

    const { type, props, shapeFlag, children } = vnode
    let el = vnode.el = hostCreateElement(type)

    // children是文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)

      // children是数组
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(el, children)
    }

    //添加props
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    hostInsert(el, container)
  }


  const patchProps = (oldProps, newProps, el) => {
    if (oldProps === newProps) return;

    //新的有老的没有 添加新的
    for (let key in newProps) {
      const prevProp = oldProps[key]
      const nextProp = newProps[key]
      if (prevProp != nextProp) {
        hostPatchProp(el, key, prevProp, nextProp)
      }
    }

    //老的没有新的有删除老的
    for (let key in oldProps) {
      if (!(key in newProps)) {
        hostPatchProp(el, key, oldProps[key], null)
      }
    }
  }

  const patchElement = (n1, n2, container) => {
    //新node复用旧node的el
    let el = n2.el = n1.el

    const oldProps = n1.props || {}
    const newProps = n2.props || {}
    //更新参数
    patchProps(oldProps, newProps, el)
    //更新孩子
    // patchChildren(n1, n2, container)
  }

  const processElement = (n1, n2, container) => {
    if (n1 == null) {
      // 把n2转换为真实dom挂载到容器中
      console.log('把n2变为真实dom挂载到container')

      mountElement(n2, container)
    } else {
      // 更新
      console.log('元素更新')
      patchElement(n1, n2, container)
    }
  }


  const processText = (n1, n2, container) => {
    if (n1 == null) {
      //创建一个文本节点 此时的n2.children是一个字符串
      const textNode = hostCreateText(n2.children)
      hostInsert(textNode, container)
    } else {
      console.log('Text更新')
    }
  }


  const unmount = (vnode) => {
    hostRemove(vnode.el)
  }
  /**
   * 
   * @param n1 老vnode
   * @param n2 新vnode
   * @param container 挂载的容器
   */
  const patch = (n1, n2, container) => {

    //如果新节点和老节点不相等,删除老节点 
    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1)
      n1 = null
    }

    if (n1 == n2) return; //新老节点相同不需要更新

    const { shapeFlag, type } = n2

    switch (type) {
      //normalizeVNode后的文本类型
      case Text:
        console.log('patch Text-------')
        processText(n1, n2, container)
        break;
      default:
        if (shapeFlag & ShapeFlags.COMPONENT) { //如果当前是一个组件的vnode
          console.log('patch组件-------')
          processComponent(n1, n2, container)
        } else if (shapeFlag & ShapeFlags.ELEMENT) {
          console.log('patch元素-------')
          processElement(n1, n2, container)
        }
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
