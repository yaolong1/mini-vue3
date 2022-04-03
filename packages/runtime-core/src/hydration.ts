import { ShapeFlags } from '@mini-vue3/shared';
import { VNode, Fragment, Text } from './vnode';
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
    return nextSibling(node)
  }


  //激活元素
  const hydrateElement = (node: Element, vnode: VNode, parentComponent: ComponentInternalInstance) => {
    console.log('激活元素', node, vnode)
    return null
  }

  //激活Fragment
  const hydrateFragment = (node: Comment, vnode: VNode, parentComponent: ComponentInternalInstance) => {
    console.log('激活Fragment')

    //TODO
    return null
  }


  return [hydrate, hydrateNode] as const //as const将返回的数组变为一个常量，使外部不能随意改变这个数组
}