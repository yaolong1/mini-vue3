import { VNode, isKeepAlive, Fragment, toRaw, TransitionHooks, TransitionProps, Comment } from "@mini-vue3/runtime-core"

function getKeepAliveChild(vnode: VNode): VNode | undefined {
  return isKeepAlive(vnode)
    ? vnode.children
      ? ((vnode.children)[0] as VNode)
      : undefined
    : vnode
}



export function getTransitionRawChildren(
  children: VNode[],
  keepComment: boolean = false
): VNode[] {
  let ret: VNode[] = []
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    // 处理fragment e.g. v-for
    if (child.type === Fragment) {
      ret = ret.concat(
        getTransitionRawChildren(child.children as VNode[], keepComment)
      )

      //注释占位符应该被跳过，例如v-if  
    } else if (keepComment || child.type !== Comment) {
      ret.push(child)
    }
  }

  return ret
}


const hook: TransitionHooks = {
  beforeEnter(el) {
    el.classList.add('enter-from')
    el.classList.add('enter-active') //激活transform过度
  },
  enter(el) {
    nextFrame(() => {
      //enter阶段
      el.classList.remove('enter-from')
      el.classList.add('enter-to')
      //过度完成后监听，删除类enter-active和enter-to
      el.addEventListener("transitionend", () => {
        el.classList.remove('enter-active')
        el.classList.remove('enter-to')
      })
    })
  },
  leave(el, remove) {
    //1、卸载的初始阶段  添加卸载前的class
    el.classList.add('leave-from')
    el.classList.add('leave-active')
    //强制reflow使过度状态生效
    document.body.offsetHeight

    //下一帧执行过度
    nextFrame(() => {
      //先删除leave-from,添加leave-to
      el.classList.remove('leave-from')
      el.classList.add('leave-to')

      //监听过度完成
      el.addEventListener('transitionend', () => {
        //删除过度的样式
        el.classList.remove('leave-active')
        el.classList.remove('leave-to')
        //最后删除el
        remove()
      })
    })
  }
}

//下一帧执行
function nextFrame(cb: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(cb)
  })
}


export const Transition = {
  name: 'transition',
  setup(props: TransitionProps, { slots }) {
    return () => {


      if (!slots.default) {
        return null
      }
      const children = getTransitionRawChildren(slots.default())
      if (children.length > 1) {
        //TODO如果有多个可以需要使用<transition-group/>
        return children
      }


      const child = children[0]
      const innerVNode = getKeepAliveChild(child)

      //获取原对象，以上操作触发响应式更新
      const rawProps = toRaw(props) as TransitionProps

      const { mode } = rawProps
      //TODO 这里会根据mode来设置过渡的模式

      //设置过度钩子钩子到innerVNode
      if (!mode || mode === 'default') {
        innerVNode.transition = hook
      }

      return innerVNode
    }
  }
}