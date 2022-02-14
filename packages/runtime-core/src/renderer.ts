import { isSameVNodeType, normalizeVNode, Text } from './vnode';
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


  const processElement = (n1, n2, container, anchor) => {
    if (n1 == null) {
      // 把n2转换为真实dom挂载到容器中
      console.log('把n2变为真实dom挂载到container')
      mountElement(n2, container, anchor)
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
      n2.el = textNode
      hostInsert(textNode, container)
    } else {
      console.log('Text更新')
    }
  }


  // 卸载children
  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i])
    }
  }

  // 卸载元素
  const unmount = (vnode) => {
    hostRemove(vnode.el)
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
  const mountElement = (vnode, container, anchor) => {
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

    hostInsert(el, container, anchor)
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



  /**
   * 
   * @param c1 老的children
   * @param c2 新的children
   * @param container
   */
  const patchKeyedChildren = (c1, c2, container) => {
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
      const n2 = normalizeVNode(c2[i]) // 要先常规化一下，不然后面比较的时候新节点有可能是一个字符串
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
      const n2 = normalizeVNode(c2[e2])

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
        const anchor = nextPos < c2.length ? c2[nextPos].el : null
        while (i <= e2) {
          patch(null, c2[i], container, anchor)
          i++
        }
      }

       //===========common sequence unmount==============
      /**
       * 
       * 看i和e1的关系 如果i>e2说明老的children有多余的元素需要删除
       * 删除的元素就是 [i,e1]之间的索引所对应的元素
       * 例子
       * c1= a b c
       * c2= a b 
       * 
       * 此时执行完相同元素path之后 i=2 e1=2 e2=1
       * 2>1 所以有新元素 删除的元素在索引区间[2,2]   c1[2]=c c为删除元素
       * 
       * 
       * 
       * 
       * c1= c a b
       * c2=   a b  这种同样也成立 i=0 e1=0 e2=-1  i>e2   删除元素索引[0,0] c1[0] = c
       * 插入的时候必须要有参照物 anchor
       * 
       * 如果e2下一个索引有值并且大于新children长度 c2 说明当前更新元素是最后一个 参照物为空
       * 如果e2下一个索引有值并且小于新children长度 c2 说明当前更新元素后面还有元素 直接把后面的元素当做参照物插入
       * 下一个节点 nextPos = e2 + 1
       * anchor = nextPos < c2.length ? c2[nextPos].el : null
       * 
       */
    } else if (i > e2) { //有删除元素
      while (i <= e1) {  //删除 i到e1之间的元素
        unmount(c1[i])
        i++
      }
    }
    console.log(e1, e2, i)
  }


  /**
   * 更新孩子
   */
  const patchChildren = (n1, n2, el) => {
    const c1 = n1.children // 新孩子
    const c2 = n2.children // 旧孩子

    const prevShapeFlag = n1.shapeFlag // 旧的shapeFlag
    const shapeFlag = n2.shapeFlag // 新的shapeFlag

    // 新孩子是文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 旧孩子是数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        //卸载旧孩子
        unmountChildren(c1)
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
          //diff
          patchKeyedChildren(c1, c2, el)
        } else {
          unmountChildren(c1)
        }
      } else {
        //旧孩子是文本 清空旧孩子
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, '')
        }

        //新孩子是数组挂载新孩子
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(el, c2)
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


  /**
   * 更新元素
   * @param n1 
   * @param n2 
   * @param container 
   */
  const patchElement = (n1, n2, container) => {
    //新node复用旧node的el
    let el = n2.el = n1.el

    const oldProps = n1.props || {}
    const newProps = n2.props || {}
    //更新参数
    patchProps(oldProps, newProps, el)
    //更新孩子
    patchChildren(n1, n2, el)
  }

  /**
   * 
   * @param n1 老vnode
   * @param n2 新vnode
   * @param container 挂载的容器
   */
  const patch = (n1, n2, container, anchor = null) => {

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
          processElement(n1, n2, container, anchor)
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
