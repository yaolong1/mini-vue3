import { isOn, ShapeFlags } from '@mini-vue3/shared';
import { VNode, Fragment, Text, normalizeVNode } from './vnode';
import { ComponentInternalInstance } from './component';
import { RendererInternals } from "./renderer";

const enum DOMNodeTypes {
  ELEMENT = 1,
  TEXT = 3,
  COMMENT = 8
}

const isComment = (node: Node): node is Comment =>
  node.nodeType === DOMNodeTypes.COMMENT

/**
 * 创建激活函数
 * @param rendererInternals 
 */
export function createHydrationFunctions(
  rendererInternals: RendererInternals<Node, Element>
) {
  const {
    mt: mountComponent,
    p: patch,
    o: { patchProp, nextSibling, parentNode, remove, insert, createComment }
  } = rendererInternals

  const hydrate = (vnode, container: Element) => {

    //如果container存在children
    if (container.hasChildNodes())
      hydrateNode(container.firstChild, vnode, null)
  }

  const hydrateNode = (
    node: Node, //真实节点
    vnode: VNode, // 虚拟节点
    parentComponent: ComponentInternalInstance | null //根组件实例
  ) => {

    const isFragmentStart = isComment(node) && node.data === '['

    vnode.el = node //复用真实节点
    const domType = node.nodeType //dom的类型
    const { type, props, children, shapeFlag } = vnode

    //下一个真实节点，以方便后续的激活操作
    let nextNode: Node | null = null

    switch (type) {
      case Text:
        if (domType !== DOMNodeTypes.TEXT) {
          //如果当前虚拟节点和真实节点不匹配
          //TODO 处理不匹配的节点
        } else {
          if ((node as Text).data !== children) {
            //真实dom中的文本内容和虚拟节点的文本内容不相同
            console.warn('文本不一致'
              + `\n服务端: ${vnode.children}`
              + `\n客户端: ${(node as Text).data}`
            )
              //把虚拟节点文本内容替换到真实节点内容
              ; (node as Text).data = children as string
          }
        }

        //设置下一个兄弟节点
        nextNode = nextSibling(node)
        break;
      case Comment:
        if (domType !== DOMNodeTypes.COMMENT || isFragmentStart) {
          //这里把Fragment的定界标记也算进来
          //TODO 不匹配的操作处理
        } else {
          nextNode = nextSibling(node)
        }
        break;
      case Fragment:
        if (!isFragmentStart) {
          //如果不是Fragment开始定界符说明当前的真实dom并不是Fragment
          //TODO 需要错误处理
        } else {
          nextNode = hydrateFragment(
            node as Comment,
            vnode,
            parentComponent)
        }
        break
      default:
        if (shapeFlag & ShapeFlags.COMPONENT) {
          //获取node的父容器
          const container = parentNode(node)
          //挂载组件
          mountComponent(vnode, container, null, parentComponent)

          nextNode = nextSibling(node)

        } else if (shapeFlag & ShapeFlags.ELEMENT) {

          if (domType !== DOMNodeTypes.ELEMENT ||
            (vnode.type as string).toLowerCase() !==
            (node as Element).tagName.toLowerCase()
          ) {
            //domType不是ELement，虚拟节点的名称和真是节点的标签名称不相同
            //TODO 需要做不同节点的处理
          } else {
            nextNode = hydrateElement(
              node as Element,
              vnode,
              parentComponent
            )
          }

        }
    }
    return nextNode
  }


  //激活元素
  const hydrateElement = (el: Element, vnode: VNode, parentComponent: ComponentInternalInstance) => {
    console.log('激活元素', el, vnode)
    const { children, props, shapeFlag } = vnode

    //激活props
    if (props) {
      for (let key in props) {
        //激活事件
        if (isOn(key)) {
          patchProp(el, key, null, props[key])
        }
      }
    }
    //激活children
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      let next = hydrateChildren(
        el.firstChild,
        children,
        el,
        parentComponent
      )

      if (next) {
        //如果存在next 说明el的childrenNodes比vnode的children多，需要删除多余的真实dom节点

        console.warn(`${el.tagName}标签中孩子节点比虚拟dom孩子节点多`)
        while (next) {
          const cur = next
          next = nextSibling(next)
          //刪除多余的节点
          remove(cur)
        }
      }

    } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      //这里要校验一下children是否相等，不等直接替换,这里和Text逻辑一样
      if (el.textContent !== children) {
        console.warn('文本不一致'
          + `\n服务端: ${vnode.children}`
          + `\n客户端: ${el.textContent}`
        )
        el.textContent = children
      }
    }

    //返回写一个真实节点
    return nextSibling(el)
  }

  //激活Fragment
  const hydrateFragment = (node: Comment, vnode: VNode, parentComponent: ComponentInternalInstance) => {
    console.log('激活Fragment')

    //TODO
    return null
  }

  //激活children
  const hydrateChildren = (
    node: Node,
    children: VNode[],
    container: Element,
    parentComponent: ComponentInternalInstance
  ) => {
    for (let i = 0; i < children.length; i++) {
      const child = normalizeVNode(children[i])

      if (node) {
        //如果存在node，就进行激活
        node = hydrateNode(node, child, parentComponent)
      } else {
        //不存在真实dom，根据虚拟dom创建真实dom
        console.warn(`真实dom不存在，但虚拟dom: ${child} 存在`)

        //根据虚拟dom创建真实dom
        patch(
          null,
          child,
          container,
          null,
          parentComponent
        )
      }
    }

    //返回下一个兄弟节点，一般是空的，
    //因为把当前container下的所有节点处理完后下一个节点为空
    //如果返回的node有值，说明真实dom比虚拟dom多
    return node
  }


  return [hydrate, hydrateNode] as const //as const将返回的数组变为一个常量，使外部不能随意改变这个数组
}