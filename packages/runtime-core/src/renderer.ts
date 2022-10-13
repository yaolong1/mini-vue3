import { KeepAliveContext } from './components/KeepAlive';
import { Fragment, isSameVNodeType, normalizeVNode, Text, VNode } from './vnode';
import { effect, ReactiveEffect } from '@mini-vue3/reactivity';
import { invokeArrayFns, ShapeFlags, isFunction } from '@mini-vue3/shared';
// 主要是一些与平台无关的代码，依赖响应式模块 (平台相关的代码一般只是传入runtime-core Api中)

import { createAppAPI } from './apiCreateApp'
import { createComponentInstance, setupComponent, ComponentInternalInstance } from './component';
import { queueJob } from './scheduler';
import { renderComponentRoot, shouldUpdateComponent } from './componentRenderUtils';
import { resolveProps } from './componentProps';
import { updateSlots } from './componentSlots';
import { TeleportImpl } from './components/Teleport';
import { createHydrationFunctions } from './hydration';

export interface RendererNode {
  [key: string]: any
}

export interface RendererElement extends RendererNode { }

type MoveFn = (
  vnode: any,
  container: RendererElement,
  anchor?: RendererNode | null,
  type?: any
) => void

type PatchFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor?: RendererNode | null,
  parentComponent?: ComponentInternalInstance | null,
) => void

type MountChildrenFn = (
  container: RendererElement,
  children: VNode[],
  anchor: RendererNode | null,
  start?: number
) => void

type PatchChildrenFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  rootComponent: ComponentInternalInstance | null
) => void


type UnmountFn = (
  vnode: VNode,
  parentComponent: ComponentInternalInstance,
) => void


type UnmountChildrenFn = (
  children: VNode[],
  start?: number
) => void

export type MountComponentFn = (
  initialVNode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
) => void

export interface RendererInternals<HostNode = RendererNode, HostElement = RendererElement> {
  p: PatchFn
  um: UnmountFn
  m: MoveFn
  mt: MountComponentFn
  mc: MountChildrenFn
  pc: PatchChildrenFn
  o: RendererOptions<HostNode, HostElement>
}


export interface RendererOptions<HostNode = RendererNode, HostElement = RendererElement> {
  patchProp(
    el: HostElement,
    key: string,
    prevValue: any,
    nextValue: any,
  ): void
  insert(el: HostNode, parent: HostElement, anchor?: HostNode | null): void
  remove(el: HostNode): void
  createElement(
    type: string,
  ): HostElement
  createText(text: string): HostNode
  setText(node: HostNode, text: string): void
  setElementText(node: HostElement, text: string): void
  createComment(text: string): HostNode
  parentNode(node: HostNode): HostNode | null
  nextSibling(node: HostNode): HostNode | null
  querySelector?(selector: string): HostElement | null
  firstChild?(el: HostElement): HostNode | null
}


//当前组件是否是keepAlive组件
export const isKeepAlive = (vnode): boolean => !!vnode.type.__isKeepAlive


/**
 * 创建一个渲染器
 * @param renderOptions // 第三方平台的api选项 
 * @returns {render,createApp()}
 */
export function createRenderer<
  HostNode = RendererNode,
  HostElement = RendererElement
>(renderOptions: RendererOptions<HostNode, HostElement>) {
  return baseCreateRenderer<HostNode, HostElement>(renderOptions)
}


/**
 * 创建一个客户端激活服务端HTML字符串的渲染器
 * @param renderOptions // 第三方平台的api选项 
 * @returns {render,createApp()}
 */
export function createHydrationRenderer(renderOptions: RendererOptions<Node, Element>) {
  return baseCreateRenderer(renderOptions, createHydrationFunctions)
}


//base
function baseCreateRenderer<
  HostNode = RendererNode,
  HostElement = RendererElement
>(
  renderOptions: RendererOptions<HostNode, HostElement>,
  createHydrationFns?: typeof createHydrationFunctions
)

// implementation
function baseCreateRenderer(
  renderOptions: RendererOptions,
  createHydrationFns?: typeof createHydrationFunctions
): any {
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
    nextSibling: hostNextSibling,
    firstChild: hostFirstChild,
    createComment: hostCreateComment,
  } = renderOptions





  // 调用render函数用 把render函数放进ReactiveEffect中
  const setupRenderEffect = (initialVNode, instance, container, anchor) => {

    //options生命周期
    const { beforeMount, mounted, beforeUpdate, updated } = initialVNode.type


    console.log('初始化调用render')
    // 创建渲染effect
    // 核心是调用render, 数据发生变化就会重新调用render
    const componentUpdateFn = () => {
      const { bm, m, u, bu, proxy } = instance

      if (!instance.isMounted) {
        // 初次挂载 会调用render方法
        // 渲染页面的时候响应式对象会取值,取值的时候会进行依赖收集 收集对应的effect
        // 当渲染完成之后，如果数据发生了改变会再次执行当前方法
        const subTree = instance.subTree = renderComponentRoot(instance) //渲染调用h方法
        // 真正开始渲染组件 即渲染subTree //前面的逻辑其实就是为了得到suTree,初始化组件实例为组件实例赋值之类的操作
        if (bm) {
          // 触发onBeforeMounted
          invokeArrayFns(bm)
        }
        beforeMount && beforeMount.call(proxy) // beforeMount钩子

        if (initialVNode.el) {
          //如果有真实dom说明当客户端需要激活
          hydrateVNode(initialVNode.el, subTree, instance)
        } else {
          patch(null, subTree, container, anchor, instance)
        }
        initialVNode.el = subTree.el
        instance.isMounted = true

        if (m) {
          // 触发onMounted
          invokeArrayFns(m)
        }
        mounted && mounted.call(proxy)
      } else {

        // let { next, vnode } = instance

        // if (next) {
        //   next.el = vnode.el
        // } else { 
        //   next = vnode
        // }


        const nextTree = renderComponentRoot(instance)
        // 组件更新
        //diff算法 比较两课前后的树 更新\删除
        console.log('组件更新逻辑')
        const prevTree = instance.subTree
        instance.subTree = nextTree
        if (bu) {
          // 触发onBeforeUpdate
          invokeArrayFns(bu)
        }
        beforeUpdate && beforeUpdate.call(proxy)
        patch(prevTree, nextTree, container, anchor, instance)

        if (u) {
          // 触发onUpdated
          invokeArrayFns(u)
        }

        updated && updated.call(proxy)
      }
    }

    // instance.update = effect(componentUpdateFn, { scheduler: () => queueJob(instance.update) })
    const effect = new ReactiveEffect(componentUpdateFn, () => queueJob(instance.update))
    // 调用update方法就会执行 componentUpdateFn
    const update = instance.update = effect.run.bind(effect)
    update()
  }


  /**
   * 组件更新逻辑
   * @param n1 
   * @param n2 
   * @param container 
   * @param anchor 
   */
  function updateComponent(n1, n2) {
    //复用老的组件实例
    const instance = n2.component = n1.component as ComponentInternalInstance
    const { props, attrs } = instance


    // 比对props、attrs是否更新，有更新则更新
    if (shouldUpdateComponent(n1, n2)) {

      //把新的node赋值给实例
      instance.vnode = n2

      //将新的组件实例上的props和attrs解析出来
      const { props: newProps, attrs: newAttrs } = resolveProps(n2.type.props, n2.props)
      //props
      patchComponentProps(props, newProps)
      //attrs
      patchComponentProps(attrs, newAttrs)

      //slots
      updateSlots(instance, n2.children)

      // instance.next = n2

      instance.update()
    } else {
      n2.component = n1.component
      n2.el = n1.el
      instance.vnode = n2
    }

  }



  function patchComponentProps(props, newProps) {
    for (let key in newProps) {
      const prop = props[key]
      const newProp = newProps[key]
      //不同就更新
      if (prop !== newProp) {
        props[key] = newProps[key]
      }
    }
    for (let key in props) {
      if (!(key in newProps)) {
        delete props[key]
      }
    }
  }

  const processComponent = (n1, n2, container, anchor, parentComponent) => {

    if (n1 == null) {

      if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        //如果当前组件是被缓存的组件就激活
        (parentComponent.ctx as KeepAliveContext).activate(
          n2,
          container,
          anchor,
        )

      } else {
        //组件的挂载
        mountComponent(n2, container, anchor, parentComponent)
      }
    } else {
      //组件的更新
      updateComponent(n1, n2)
    }
  }


  const processElement = (n1, n2, container, anchor, parentComponent) => {
    if (n1 == null) {
      // 把n2转换为真实dom挂载到容器中
      console.log('把n2变为真实dom挂载到container')
      mountElement(n2, container, anchor, parentComponent)
    } else {
      // 更新
      console.log('元素更新')
      patchElement(n1, n2, parentComponent)
    }
  }


  const processText = (n1, n2, container, anchor) => {
    if (n1 == null) {
      //创建一个文本节点 此时的n2.children是一个字符串
      const textNode = n2.el = hostCreateText(n2.children)
      hostInsert(textNode, container, anchor)
    } else {
      console.log('Text更新')
      const el = n2.el = n1.el
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children)
      }
    }
  }


  const processFragment = (n1, n2, container, anchor, parentComponent) => {

    const fragmentStartAnchor = n2.el = n1 ? n1.el : hostCreateText('')
    const fragmentEndAnchor = n2.anchor = n1 ? n1.anchor : hostCreateText('')


    if (!n1) {

      //不知道做什么，推测是用于move()操作 #
      hostInsert(fragmentStartAnchor, container, anchor)
      hostInsert(fragmentEndAnchor, container, anchor)
      //不存在旧节点，直接挂载
      mountChildren(container, n2.children, fragmentEndAnchor, parentComponent)
    } else {
      //存在旧节点
      patchChildren(n1, n2, container, fragmentEndAnchor, parentComponent)
    }
  }

  const processCommentNode = (n1, n2, container, anchor) => {
    if (n1 == null) {
      hostInsert(
        (n2.el = hostCreateComment((n2.children as string) || '')),
        container,
        anchor
      )
    } else {
      //动态注释不支持
      n2.el = n1.el
    }
  }

  // 卸载children
  /**
   * 
   * @param children 
   * @param start 卸载的开始节点默认第一个
   */
  const unmountChildren = (children, parentComponent, start = 0) => {
    for (let i = start; i < children.length; i++) {
      unmount(children[i], parentComponent)
    }
  }

  // 卸载元素
  const unmount = (vnode: VNode, parentComponent) => {

    const {
      el,
      type,
      shapeFlag,
      component,
      children,
      transition } = vnode


    //如果是碎片就卸载它的孩子节点
    if (type === Fragment) {
      children.forEach((v) => unmount(v, parentComponent))
    }


    if (shapeFlag & ShapeFlags.COMPONENT) {

      //判断vnode是否应该keepAlive，如果是就不需要卸载,直接让其无效
      if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {

        (parentComponent.ctx as KeepAliveContext).deactivate(vnode)
        return
      }

      //拿到当前组件的卸载生命周期
      const { um, bum, subTree } = component
      //卸载组件之前
      bum && invokeArrayFns(bum)

      //卸载组件本质上是卸载subTree
      unmount(subTree, parentComponent)
      //卸载组件之后
      um && invokeArrayFns(um)
      return
    }


    const performRemove = () => hostRemove(el)
    if (transition) {
      //当前节点有过渡动画,执行leave过渡
      transition.leave(el, performRemove)
    } else {
      performRemove()
    }
  }

  /**
   * 挂载孩子
   * @param container 
   * @param children 
   * @param start 挂载开始的节点索引 
   */
  const mountChildren = (container, children, anchor, parentComponent, start = 0) => {
    for (let i = start; i < children.length; i++) {
      const child = children[i] = normalizeVNode(children[i])
      patch(null, child, container, anchor, parentComponent)
    }
  }

  /**
   * 挂载元素
   * @param vnode 挂载的虚拟DOM
   * @param container 
   */
  const mountElement = (vnode: VNode, container: RendererElement, anchor: RendererNode, parentComponent) => {
    // vnode中的children永远只有两种情况：数组、字符串
    // 如果vnode的children是一个对象或vnode则要被h函数转化为数组
    // 所以children只有字符串和数组

    let el: RendererElement

    const { type, props, shapeFlag, children, transition } = vnode

    el = vnode.el = hostCreateElement(type as string)
    // children是文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)

      // children是数组
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(el, children, null, parentComponent)
    }

    //添加props
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }


    //当前虚拟节点是否有过渡====beforeEnter
    if (transition) {
      transition.beforeEnter(el)
    }

    hostInsert(el, container, anchor)

    //当前虚拟节点是否有过渡====enter
    if (transition) {
      transition.enter(el)
    }
  }


  // 组件的挂载流程
  const mountComponent = (initialVNode, container, anchor, parentComponent) => {

    // 将组件的vnode渲染到容器中
    const componentOptions = initialVNode.type




    // 1、给组件创造一个组件实例 
    const instance = initialVNode.component = createComponentInstance(initialVNode, parentComponent)


    //判断当前的组件是否是KeepAlive组件,如果是就注入内部方法
    if (isKeepAlive(initialVNode)) {
      (instance.ctx as KeepAliveContext).renderer = internals
    }

    // 2、给组件的实例进行赋值
    setupComponent(instance)


    // 3、调用render方法实现组件的渲染逻辑（首次渲染即需要render函数中所有依赖的响应式对象 =>依赖收集）
    // 这里就会使用reactiveEffect，因为视图和数据时双向绑定的 数据变->视图变
    setupRenderEffect(initialVNode, instance, container, anchor)
  }



  const patchUnKeyedChildren = (c1, c2, container, anchor, parentComponent) => {
    const oldLength = c1.length
    const newLength = c2.length
    //公共部分
    const commonLength = Math.min(oldLength, newLength)

    //patch公共部分节点
    for (let i = 0; i < commonLength; i++) {
      let preVNode = c1[i]
      let nextVNode = c2[i]
      patch(preVNode, nextVNode, container)
    }


    if (oldLength > newLength) {
      // 卸载老节点
      unmountChildren(c1, commonLength)
    } else {
      // 挂载新节点
      mountChildren(container, anchor, parentComponent, commonLength)
    }
  }



  /**
   * 有key的快速diff
   * @param c1 老的children
   * @param c2 新的children
   * @param container
   */
  const patchKeyedChildren = (c1, c2, container, parentAnchor, parentComponent) => {
    let e1 = c1.length - 1 //c1最大的索引值
    let e2 = c2.length - 1 //c2最大的索引值
    let i = 0 //从头开始比

    /**
     * 1. sync form start 从头开始c1和c2一个一个的互相比,直到比较的时候出现其中一个为空则结束比较
     * 
     * 例子
     * c1: a b c          最大索引 e1 = 2
     * c2: a b c d e      最大索引 e2 = 4
     * 
     * i = 0 从头开始比较
     * -------------------------------------
     *         指针       | c1[i] | c2[i]   |
     * -------------------------------------
     * i = 0  e1=2  e2=4  |   a   和   a   比
     * i = 1  e1=2  e2=4  |   b   和   b   比
     * i = 2  e1=2  e2=4  |   c   和   c   比
     * i = 3  e1=2  e2=4  |       和   d   比 // 终止
     * -------------------------------------
     * i = 3 e1=2 e2=4 时  c1[i] != c2[i] 停止比较退出循环
     * 
     * 
     */
    while (i <= e1 && i <= e2) { //如果i和 新的孩子或老的孩子的指针重合 说明相同的比较完毕
      const n1 = c1[i] // 老节点
      const n2 = c2[i] = normalizeVNode(c2[i]) // 要先常规化一下，不然后面比较的时候新节点有可能是一个字符串
      // 如两个节点是相同节点,说明可以复用el,则需要递归比对自身属性和孩子是否更新
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container)
      } else {
        break; // 不相等就退出循环
      }
      i++
    }

    /**
     * 2. sync form end 从头开始c1和c2一个一个的互相比,直到比较的时候出现其中一个为空则结束比较
     * 
     * 例子
     * c1:   a b c       最大索引 e1 = 2
     * c2: d e b c       最大索引 e2 = 3
     * 
     * i = 0 从末尾开始比较
     * -------------------------------------
     *         指针       | c1[i] | c2[i]   |
     * -------------------------------------
     * i = 0  e1=2  e2=3  |   c   和   c   比
     * i = 0  e1=1  e2=2  |   b   和   b   比
     * i = 0  e1=0  e2=1  |   a   和   e   比 //终止
     * i = 0  e1=   e2=   |       和       比
     * -------------------------------------
     * i = 0 e1=0 e2=1 时  c1[e1] != c2[e2] 停止比较退出循环
     * 
     */

    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2] = normalizeVNode(c2[e2])

      if (isSameVNodeType(n1, n2)) {
        // 相同更新
        patch(n1, n2, container)
      } else {
        // 不同退出
        break;
      }
      e1--
      e2--
    }

    //===========common sequence mount==============
    /**
     * 
     * 看i和e1的关系 如果i>e1说明新的children有新增的元素
     * 新增元素就是 [i,e2]之间的索引所对应的元素
     * 例子
     * c1= a b
     * c2= a b c
     * 
     * 此时执行完相同元素path之后 i=2 e1=1 e2=2
     * 2>1 所以有新元素 新增元素在索引区间[2,2]   c2[2]=c c为新增元素
     * 
     * 
     * 
     * 
     * c1=   a b
     * c2= c a b  这种同样也成立 i=0 e1=-1 e2=0  i>e1   新增元素索引[0,0] c2[0] = c
     * 插入的时候必须要有参照物 anchor
     * 
     * 如果e2下一个索引有值并且大于新children长度 c2 说明当前更新元素是最后一个 参照物为空
     * 如果e2下一个索引有值并且小于新children长度 c2 说明当前更新元素后面还有元素 直接把后面的元素当做参照物插入
     * 下一个节点 nextPos = e2 + 1
     * anchor = nextPos < c2.length ? c2[nextPos].el : null
     * 
     */
    if (i > e1) { // 看i和e1的关系 如果i>e1说明新的多有新增的元素
      if (i <= e2) { // 新增元素就是 [i,e2]之间的索引所对应的元素

        //参照物
        /**
         * c1=   a b
         * c2= c a b 
         */
        const nextPos = e2 + 1
        //如果e2下一个索引有值并且大于新children长度 c2 说明当前更新元素是最后一个 参照物为空 直接appendChild
        //如果e2下一个索引有值并且小于新children长度 c2 说明当前更新元素后面还有元素 直接把后面的元素当做参照物插入 
        const anchor = nextPos < c2.length ? c2[nextPos].el : parentAnchor
        while (i <= e2) {
          patch(null, c2[i], container, anchor)
          i++
        }
      }

      //===========common sequence unmount==============
    } else if (i > e2) { //有删除元素
      while (i <= e1) {  //删除 i到e1之间的元素
        unmount(c1[i], parentComponent)
        i++
      }
    } else {

      // unknown sequence
      /**
       * 如果序列是这样的形式
       * 例子                    i=0
       * c1 = a b c d   e f g   e1=6
       * c2 = a b e c d h f g   e2=7
       * 
       * 最终比对完公共部分,剩下的序列就是未知序列
       * 
       * 
       * 前序比对和后序比对完成后 此时的 i=2 e1=4 e2=5
       * 
       * 
       * 
       * c1 未知序列 c d e
       * c2 未知序列 e c d h
       * 
       * c 和 d 可以复用 需要采用以下方法来进行删除或者新增
       */

      let s1 = i //标记c1未知序列的开始 [s1,e1] 代表老的孩子未知列表 
      let s2 = i //标记c2未知序列的开始 [s2,e2] 代表新的孩子未知列表
      let moved = false //是否需要移动
      let pos = 0 //主要用于判断是否递增，递增表示不需要移动、不递增表示需要移动
      let patched = 0 //需要更新的数量


      // 根据新的节点制造一个映射表,用老的列表去映射表中挨个查,如果存在则复用（patch）,不存在就删除老的。最后多余的新的就是需要追加的
      //映射表
      const keyToNewIndexMap = new Map() //例子 {e:2,c:3,d:4,h:5}

      for (let i = s2; i <= e2; i++) {
        const child = c2[i]
        keyToNewIndexMap.set(child.key, i)
      }

      // 新位置序列个数
      const toBePatched = e2 - s2 + 1 //例子中的个数是4
      // 创建一个数组长度为新节点个数，数组全部初始化为0,用于记录哪个是新增节点 和 将新的元素映射到老的元素的索引
      const newIndexToOldMapIndex = new Array(toBePatched).fill(0) // [5,3,4,0] // 算法最长递增子序列会用到这个数组映射表

      //拿老序列到新序列映射表中查找
      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i]
        const newIndex = keyToNewIndexMap.get(prevChild.key)

        if (patched <= toBePatched) {
          if (newIndex) { //新的里面有老的说明需要复用patch
            // 1、保证不是0,是0就是新增元素 2、将新的元素映射到老的元素的索引  新的索引= s2+当前数组的索引 老的索引 = newIndexToOldMapIndex[当前数组索引]
            /**
             * 例子
             * 假如 newIndexToOldMapIndex = [2,3,4,0] 
             * 新索引  旧索引
             *  0+s2    2
             *  1+s2    3
             *  1+s2    4
             */
            newIndexToOldMapIndex[newIndex - s2] = i + 1

            // 填表后需要patch两个相同元素 (复用el n1.el=n2.el 后续插入的时候直接复用提高性能)
            patch(prevChild, c2[newIndex], container)

            //标记一下是否需要移动,一个小优化:有要移动的节点下次就不需要执行了，因为已经知道需要移动了，下次如果也需要移动其实是多余的
            if (newIndex < pos && moved === false) {
              moved = true
            } else {
              pos = newIndex
            }

            patched++ //记录当前更新个数
          } else {  //需要删除老的
            unmount(prevChild, parentComponent)
          }
        } else {
          unmount(prevChild, parentComponent)
        }
      }


      const queue = getSequence(newIndexToOldMapIndex) //得到newIndexToOldMapIndex 的最长递增子序列的索引

      let j = queue.length - 1 //[1,2] newIndexToOldMapIndex索引列表 也就是对应的 [3,4]不需要移动

      // 倒叙插入新增的元素
      for (let i = toBePatched - 1; i >= 0; i--) {
        const lastIndex = i + s2 // 插入元素的索引
        const lastChild = c2[lastIndex] // 当前要插入的元素
        const nextPos = lastIndex + 1 // 当前插入元素的下一个元素
        const anchor = nextPos < c2.length ? c2[nextPos].el : parentAnchor

        if (newIndexToOldMapIndex[i] === 0) { // 还没有真实节点需要创建真实节点
          patch(null, lastChild, container, anchor)
        } else if (moved) {
          //直接复用el插入，此时的el已经有值了因为在#381行已经patch复用过了
          //此处直接插入会导致重复的更新dom节点  消耗性能
          // hostInsert(lastChild.el, container, anchor)

          /**
           * 例子
           * c1 = a b [c d e  ] f g  
           * c2 = a b [e c d h] f g 
           * 
           * 最终序列 a b [e c d h] f g
           *  e c d h 都插入了一遍  事实上[c d]两个节点不需要移动
           * 
           * 相对于原序列[c d e]而言 我们可以直接把e 插入到c前面不就行了吗 --->使用最长递增子序列 减少dom插入操作
           *  
           */

          //如果当前索引和 newIndexToOldMapIndex的索引的最大递增子序列不等 说明当前的元素需要插入
          // i = [3 2 1 0] queue=[2 1]  索引是倒叙的  相同的就不需要移动 不同才移动 
          if (i !== queue[j]) {
            move(lastChild, container, anchor)
          } else {
            j-- // 这里做了个优化，表示不需要移动
          }
        }
      }
    }
  }

  /**
   * 有key的简单diff
   * @param c1 
   * @param c2 
   * @param container 
   * @param parentAnchor 
   */
  const patchSimpleKeyedChild = (c1, c2, container, parentAnchor, parentComponent) => {
    console.log(c1, c2)
    const newChildren = c2
    const oldChildren = c1

    let lastIndex
    for (let i = 0; i < newChildren.length; i++) {
      const newNode = newChildren[i]
      let find = false
      for (let j = 0; j < oldChildren.length; j++) {
        const oldNode = oldChildren[j]

        if (isSameVNodeType(newNode, oldNode)) {
          find = true
          //更新复用el
          patch(oldNode, newNode, container)
          if (j < lastIndex) {
            //需要移动元素
            //新node之前的node
            const preNode = newChildren[i - 1]
            if (preNode) {
              //移动的锚点
              const anchor = hostNextSibling(preNode.el)
              //将当前的新节点插入到anchor位置
              hostInsert(newNode.el, container, anchor)
            }

          } else {
            //不需要移动
            lastIndex = j
          }
          break
        }

      }


      //如果当前newNode在oldChildren中没有找到，当前children需要添加
      if (!find) {
        //新node之前的node
        const preNode = newChildren[i - 1]
        let anchor
        if (preNode) {
          //插入的锚点,前一个节点的下一个兄弟节点
          anchor = hostNextSibling(preNode.el)
        }
        else {
          //如果没有前一个节点说明是第一个新节点，直接插入第一个位置
          anchor = hostFirstChild(container)
        }
        patch(null, newNode, container, anchor)

      }
    }

    //删除老的
    for (let i = 0; i < oldChildren.length; i++) {
      const oldNode = oldChildren[i]
      const has = newChildren.find(newNode => isSameVNodeType(newNode, oldNode))
      if (!has) {
        //没有找到删除老的节点
        unmount(oldNode, parentComponent)
      }
    }

  }


  /**
   * 有key的双端diff
   * @param c1 
   * @param c2 
   * @param container 
   * @param parentAnchor 
   */
  const patchDoubleSideKeyedChild = (c1, c2, container, parentAnchor, parentComponent) => {
    let newStartIndex = 0; // 新节点开始索引
    let oldStartIndex = 0; // 老节点开始索引
    let newEndIndex = c2.length - 1; // 新节点结束索引
    let oldEndIndex = c1.length - 1; // 老节点结束索引

    let newStartNode = c2[newStartIndex]; // 新的开始节点
    let newEndNode = c2[newEndIndex]; // 新的结束节点
    let oldStartNode = c1[oldStartIndex]; // 旧的开始节点
    let oldEndNode = c1[oldEndIndex]; // 旧的结束节点


    while (newStartIndex <= newEndIndex && oldStartIndex <= oldEndIndex) {
      //命中情况新老children
      // const oldChildren = [
      //   h('li', { key: '1' }, '1'),
      //   h('li', { key: '2' }, '2'),
      //   h('li', { key: '3' }, '3'),
      //   h('li', { key: '4' }, '4'),
      // ]

      // const newChildren = [
      //   h('li', { key: '4' }, '4'),
      //   h('li', { key: '2' }, '2'),
      //   h('li', { key: '1' }, '1'),
      //   h('li', { key: '3' }, '3'),
      // ]

      if (!oldStartNode) {
        //当情况5命中时有可能是undefined，所以要跳过
        oldStartNode = c1[++oldStartIndex]
      } else if (!oldEndNode) {
        //当情况5命中时有可能是undefined，所以要跳过
        oldEndNode = c1[--oldEndIndex]
      } else if (isSameVNodeType(newStartNode, oldStartNode)) {
        //情况1：新老children的开始节点相同直接patch
        patch(oldStartNode, newStartNode, container);

        // 指向下一个节点
        newStartNode = c2[++newStartIndex];
        oldStartNode = c1[++oldStartIndex];
      } else if (isSameVNodeType(newEndNode, oldEndNode)) {
        //情况2：新老children的节点节点相同直接patch
        patch(oldEndNode, newEndNode, container)

        // 指向上一个节点
        newEndNode = c2[--newEndIndex];
        oldEndNode = c1[--oldEndIndex];
      } else if (isSameVNodeType(newEndNode, oldStartNode)) {
        // 情况3：新结束节点，和老的开始节点相同，patch,
        patch(oldStartNode, newEndNode, container);
        // 再将oldStartNode移动到oldEndNode后，
        const anchor = oldEndNode ? hostNextSibling(oldEndNode.el) : null
        hostInsert(oldStartNode.el, container, anchor)
        // 更新当前newEndNode, oldStartNode索引
        newEndNode = c2[--newEndIndex];
        oldStartNode = c1[++oldStartIndex];
      } else if (isSameVNodeType(newStartNode, oldEndNode)) {
        //情况4：新开始节点和老结束节点相同， patch
        patch(oldEndNode, newStartNode, container)
        // 将oldEndNode插入到oldStartNode前
        hostInsert(oldEndNode.el, container, oldStartNode.el)
        //更新newStartNode, oldEndNode索引
        newStartNode = c2[++newStartIndex]
        oldEndNode = c1[--oldEndIndex]
      } else {
        //情况5：以上情况1、2、3、4都没命中
        /**
         const oldChildren = [
          h('li', { key: '1' }, '1'),
          h('li', { key: '2' }, '2'),
          h('li', { key: '4' }, '4'),
          h('li', { key: '3' }, '3'),
        ]

        const newChildren = [
          h('li', { key: '2' }, '2'),
          h('li', { key: '1' }, '1'),
          h('li', { key: '3' }, '3'),
          h('li', { key: '4' }, '4'),
        ]
         */
        //在老children中找有没有newStartNode的索引
        const oldIndex = c1.findIndex(oldNode => isSameVNodeType(oldNode, newStartNode))
        if (oldIndex > 0) {
          const oldNode = c1[oldIndex]
          // 如果存在oldIndex就patch复用
          patch(oldNode, newStartNode, container)
          // 将找的的oldNode插入到oldStartNode前面
          hostInsert(oldNode.el, container, oldStartNode.el)
          // 将oldNode置空，因为已经处理过了
          c1[oldIndex] = undefined
        } else {

          //如果在oldChildren中没有找到newStartNode，说明newStartNode是新增的node
          //新增一个节点到头部，oldStartNode.el为锚点
          patch(null, newStartNode, container, oldStartNode.el)
        }
        // 移动newStartNode的索引并重新赋值newStartNode
        newStartNode = c2[++newStartIndex]
      }
    }


    //解决新老节点个数不同有新增节点的情况
    if (oldEndIndex < oldStartIndex && newStartIndex <= newEndIndex) {
      // 老节点已经处理完成了，但新节点还有 c2[newStartIndex <= newEndIndex] 个新增节点
      for (let i = newStartIndex; i <= newEndIndex; i++) {
        const anchor = oldStartNode ? oldStartNode.el : null
        patch(null, c2[i], container, anchor)
      }
    } else if (newEndIndex < newStartIndex && oldStartIndex <= oldEndIndex) {
      //c1中多余节点卸载
      for (let i = oldStartIndex; i <= oldEndIndex; i++) {
        unmount(c1[i], parentComponent)
      }
    }
  }

  function getSequence(arr: number[]): number[] {
    let result = [0] // 存的是最长递增子序列的索引
    let len = arr.length
    let p = arr.slice(0) //用于记录当前节点索引对应的前驱节点索引
    let start
    let end
    let middle
    for (let i = 0; i < len; i++) {
      let arrI = arr[i] //当前的值
      if (arrI !== 0) {
        let lastIndex = result[result.length - 1]
        if (arrI > arr[lastIndex]) { //如果当前值比结果索引最后一个大就直接push
          p[i] = lastIndex
          result.push(i)
          continue
        }

        //2.如果当前的值比结果索引最后一个元素小，说明当前值是有潜力的，需要替换:通过二分法找出第一个比当前值大的，替换掉它
        start = 0
        end = arr.length - 1
        while (start < end) {
          middle = (end + start) / 2 | 0 //向下取整 1.5 = 1
          if (arrI > arr[middle]) {
            start = middle + 1
          } else {
            end = middle
          }
        }

        if (arr[result[start]] > arrI) {
          p[i] = result[start - 1]
          result[start] = i // 覆盖掉第一个比arrI大的
        }
      }

    }
    let i = result.length //拿到最后一个开始向前追溯
    let last = result[i - 1] //取出最后一个

    while (i-- > 0) {
      result[i] = last
      last = p[last]
    }

    return result

  }

  // https://en.wikipedia.org/wiki/Longest_increasing_subsequence
  // function getSequence(arr: number[]): number[] {
  //   const p = arr.slice()
  //   const result = [0]
  //   let i, j, u, v, c
  //   const len = arr.length
  //   for (i = 0; i < len; i++) {
  //     const arrI = arr[i]
  //     if (arrI !== 0) {
  //       j = result[result.length - 1]
  //       if (arr[j] < arrI) {
  //         p[i] = j
  //         result.push(i)
  //         continue
  //       }
  //       u = 0
  //       v = result.length - 1
  //       while (u < v) {
  //         c = (u + v) >> 1
  //         if (arr[result[c]] < arrI) {
  //           u = c + 1
  //         } else {
  //           v = c
  //         }
  //       }
  //       if (arrI < arr[result[u]]) {
  //         if (u > 0) {
  //           p[i] = result[u - 1]
  //         }
  //         result[u] = i
  //       }
  //     }
  //   }
  //   u = result.length
  //   v = result[u - 1]
  //   while (u-- > 0) {
  //     result[u] = v
  //     v = p[v]
  //   }
  //   return result
  // }

  /**
   * 更新孩子
   */
  const patchChildren = (n1, n2, el, anchor, parentComponent) => {
    const c1 = n1.children // 新孩子
    const c2 = n2.children // 旧孩子

    const prevShapeFlag = n1.shapeFlag // 旧的shapeFlag
    const shapeFlag = n2.shapeFlag // 新的shapeFlag

    // 新孩子是文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 旧孩子是数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        //卸载旧孩子
        unmountChildren(c1, parentComponent)
      }

      // 旧孩子是文本、是数组一起处理， 因为textContent直接覆盖为新文本
      if (c1 !== c2) {
        hostSetElementText(el, c2)
      }
    } else {
      // 旧孩子是数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 新孩子是数组
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          //快速diff
          patchKeyedChildren(c1, c2, el, anchor, parentComponent)

          //简单diff
          // patchSimpleKeyedChild(c1, c2, el, anchor)

          //双端diff
          // patchDoubleSideKeyedChild(c1, c2, el, anchor)
        } else {
          //卸载旧孩子
          unmountChildren(c1, parentComponent)
        }
      } else {
        //旧孩子是文本 清空旧孩子
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, '')
        }

        //新孩子是数组挂载新孩子
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(el, c2, anchor, parentComponent)
        }

      }


      // // 新孩子是数组
      // if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      //   // 旧孩子也是数组
      //   if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      //     //diff
      //     console.log('新孩子老孩子都是数组---diff')
      //     patchKeyedChildren(c1, c2, el)

      //     //旧孩子是文本、空
      //   } else {
      //     // 清空旧孩子
      //     hostSetElementText(el, '')
      //     // 挂载新孩子到节点上
      //     mountChildren(el, c2)
      //   }

      //   // 新孩子是空 
      // } else {
      //   // 旧孩子是文本
      //   if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      //     // 清除旧孩子
      //     hostSetElementText(el, '')
      //   }

      //   // 旧孩子是数组
      //   if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      //     // 卸载旧孩子
      //     unmountChildren(c1)
      //   }
      // }

    }
  }


  const patchProps = (props, newProps, el) => {
    if (props === newProps) return;

    //新的有老的没有 添加新的
    for (let key in newProps) {
      const prevProp = props[key]
      const nextProp = newProps[key]
      if (prevProp != nextProp) {
        hostPatchProp(el, key, prevProp, nextProp)
      }
    }

    //老的没有新的有 删除老的
    for (let key in props) {
      if (!(key in newProps)) {
        hostPatchProp(el, key, props[key], null)
      }
    }
  }


  /**
   * 更新元素
   * @param n1 
   * @param n2 
   * @param container 
   */
  const patchElement = (n1, n2, parentComponent) => {
    //新node复用旧node的el
    let el = n2.el = n1.el

    const props = n1.props || {}
    const newProps = n2.props || {}
    //更新参数
    patchProps(props, newProps, el)
    //更新孩子
    //全量diff
    patchChildren(n1, n2, el, null, parentComponent)
  }



  /**
   * 
   * @param vnode 移动的节点
   * @param container 移动的目标节点
   * @param anchor 锚点
   * @param type 
   */
  const move = (vnode, container, anchor?, moveType?): MoveFn => {

    const { el, shapeFlag, type, children } = vnode
    if (shapeFlag & ShapeFlags.COMPONENT) {
      move(vnode.component.subTree, container, anchor, moveType)
      return
    }


    if (shapeFlag & ShapeFlags.TELEPORT) {
      //TODO
      // ;(type as typeof TeleportImpl).move(vnode, container, anchor, internals)
      return
    }

    if (type === Fragment) {
      hostInsert(el, container, anchor)

      for (let i = 0; i < children.length; i++) {
        move(children[i], container, anchor, moveType)
      }
      hostInsert(vnode.anchor, container, anchor)
      return
    }

    hostInsert(el, container, anchor)
  }





  /**
   * 
   * @param n1 老vnode
   * @param n2 新vnode
   * @param container 挂载的容器
   */
  const patch = (n1, n2, container, anchor = null, parentComponent = null) => {
    //如果新节点和老节点不相等,删除老节点 
    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1, parentComponent)
      n1 = null
    }

    if (n1 == n2) return; //新老节点相同不需要更新

    const { shapeFlag, type } = n2

    switch (type) {
      //normalizeVNode后的文本类型
      case Text:
        console.log('patch Text-------')
        processText(n1, n2, container, anchor)
        break;
      case Comment:
        processCommentNode(n1, n2, container, anchor)
        break
      case Fragment:
        console.log("patch Fragment-------")
        processFragment(n1, n2, container, anchor, parentComponent)
        break;
      default:
        if (shapeFlag & ShapeFlags.COMPONENT) { //如果当前是一个组件的vnode
          console.log('patch组件-------')
          processComponent(n1, n2, container, anchor, parentComponent)
        } else if (shapeFlag & ShapeFlags.ELEMENT) {
          console.log('patch元素-------')
          processElement(n1, n2, container, anchor, parentComponent)
        } else if (shapeFlag & ShapeFlags.TELEPORT) {
          //传送门组件
          ; (type as typeof TeleportImpl).process(n1, n2, container, anchor, parentComponent, internals)
        }
    }
  }



  const render = (vnode, container) => { //将虚拟节点转化为真实节点渲染到容器中

    if (vnode == null) {
      debugger
      console.log('xxx');
      //卸载
    } else {
      //更新和创建
      patch(container._vnode || null, vnode, container) // patch(prevNode,nextNode,真实节点)
    }
    //缓存起来，以后render更新时复用
    container._vnode = vnode;
  }

  const internals: RendererInternals = {
    m: move,
    um: unmount,
    mt: mountComponent,
    mc: mountChildren,
    pc: patchChildren,
    p: patch,
    o: renderOptions
  }

  //创建客户端激活函数
  let hydrate: ReturnType<typeof createHydrationFunctions>[0] | undefined
  let hydrateVNode: ReturnType<typeof createHydrationFunctions>[1] | undefined
  if (createHydrationFns) {
    [hydrate, hydrateVNode] = createHydrationFns(
      internals as RendererInternals<Node, Element>
    )
  }

  return {
    render,
    hydrate,
    createApp: createAppAPI(render, hydrate),
  } as const

}