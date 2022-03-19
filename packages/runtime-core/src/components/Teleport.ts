import { isString, ShapeFlags } from '@mini-vue3/shared';
import { RendererElement, RendererInternals, RendererNode, RendererOptions } from './../renderer';
import { VNode } from './../vnode';
export const isTeleport = (type: any): boolean => type.__isTeleport


export type TeleportVNode = VNode<RendererNode, RendererElement, TeleportProps>


export interface TeleportProps {
  to: string | null | undefined,
  disabled?: boolean
}

const resolveTarget = <T = RendererElement>(props: TeleportProps, select: RendererOptions['querySelector']): T | null => {
  //目标选择器
  const targetSelector = props && props.to
  if (isString(props.to)) {
    //如果是字符串
    if (!select) {
      console.warn('querySelector不能为空')
      return null
    } else {
      //不为空就执行拿到Element
      return select(targetSelector) as any
    }
  } else {
    if (!props.to) console.warn('Teleport参数to不能为空')
    return targetSelector as any
  }
}

export const TeleportImpl = {
  __isTeleport: true,
  process(n1: TeleportVNode, n2: TeleportVNode, container, anchor, internals: RendererInternals) {

    const { p: patch, mc: mountChildren, pc: patchChildren, m: move, o: { querySelector, createText, insert } } = internals

    if (!n1) {
      //如果n1是空，说明是第一次执行，直接将children 挂载到target上
      const { props: { to, disabled }, children, shapeFlag } = n2
      // insert anchors in the main view
      const placeholder = (n2.el = createText('teleport start'))
      const mainAnchor = (n2.anchor = createText('teleport end'))
      
      insert(placeholder, container, anchor)
      insert(mainAnchor, container, anchor)

      //获取传送的目标容器
      const target = (n2.target = resolveTarget(n2.props, querySelector))
      const targetAnchor = (n2.targetAnchor = createText('targetAnchor'))

      if (target) {
        insert(targetAnchor, target)
      }


      const mount = (container: RendererElement, anchor: RendererNode) => {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(
            container,
            children,
            anchor,
          )
        }
      }

      if (disabled) {
        //如果是禁用就不移动，直接就在原位置
        mount(container, mainAnchor)
      } else if (target) {
        mount(target, targetAnchor)
      }
    } else {
      //更新
      patchChildren(n1, n2, container, anchor)
      if (n1.props.to != n2.props.to) {
        // 如果移动的元素不同说明需要更新移动的位置
        const newTarget = querySelector(n2.props.to)
        n2.children.forEach(c => move(c, newTarget))
      }
    }
  },
  move() {

  }


}

export const Teleport = TeleportImpl