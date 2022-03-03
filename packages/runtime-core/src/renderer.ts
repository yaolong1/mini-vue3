import { Fragment, isSameVNodeType, normalizeVNode, Text } from './vnode';
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
  const setupRenderEffect = (initialVNode, instance, container, anchor) => {
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
        patch(null, subTree, container, anchor)
        initialVNode.el = subTree.el
        instance.isMounted = true
      } else {
        // 组件更新
        //diff算法 比较两课前后的树 更新\删除
        console.log('组件更新逻辑')
        const prevTree = instance.subTree
        const nextTree = instance.subTree =  instance.render.call(proxy, proxy)
        patch(prevTree, nextTree, container, anchor)
      }
    }

    const effect = new ReactiveEffect(componentUpdateFn)
    // 调用update方法就会执行 componentUpdateFn
    const update = effect.run.bind(effect)
    update()
  }

  const processComponent = (n1, n2, container, anchor) => {
    if (n1 == null) {
      //组件的挂载
      mountComponent(n2, container, anchor)
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


  const processFragment = (n1, n2, container, anchor) => {

    if (!n1) {
      //不存在旧节点，直接挂载
      mountChildren(container, n2.children)
    } else {
      //存在旧节点
      patchChildren(n1, n2, container, anchor)
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
    //如果是碎片就卸载它的孩子节点
    if (vnode.type === Fragment) {
      vnode.children.forEach((v) => unmount(v))
    }
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
  const mountComponent = (initialVNode, container, anchor) => {
    // 将组件的vnode渲染到容器中

    // 1、给组件创造一个组件实例 
    const instance = initialVNode.component = createComponentInstance(initialVNode)
    // 2、给组件的实例进行赋值
    setupComponent(instance)
    // 3、调用render方法实现组件的渲染逻辑（首次渲染即需要render函数中所有依赖的响应式对象 =>依赖收集）
    // 这里就会使用reactiveEffect，因为视图和数据时双向绑定的 数据变->视图变
    setupRenderEffect(initialVNode, instance, container, anchor)
  }



  /**
   * 
   * @param c1 老的children
   * @param c2 新的children
   * @param container
   */
  const patchKeyedChildren = (c1, c2, container, parentAnchor) => {
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
        const anchor = nextPos < c2.length ? c2[nextPos].el : parentAnchor
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

      } else {  //需要删除老的
        unmount(prevChild)
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
      } else {
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
          hostInsert(lastChild.el, container, anchor)
        } else {
          j-- // 这里做了个优化，表示不需要移动
        }
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
  const patchChildren = (n1, n2, el, anchor = null) => {
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
          patchKeyedChildren(c1, c2, el, anchor)
        } else {
          //卸载旧孩子
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

    //老的没有新的有 删除老的
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
        processText(n1, n2, container, anchor)
        break;
      case Fragment:
        console.log("patch Fragment-------")
        processFragment(n1, n2, container, anchor)
        break;
      default:
        if (shapeFlag & ShapeFlags.COMPONENT) { //如果当前是一个组件的vnode
          console.log('patch组件-------')
          processComponent(n1, n2, container, anchor)
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
