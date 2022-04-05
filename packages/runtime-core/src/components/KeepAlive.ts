import { isArray, isString } from '@mini-vue3/shared';
import { isAsyncWrapper } from './../apiAsyncComponent';
import { isVNode } from './../vnode';
import { ShapeFlags } from '@mini-vue3/shared';
import { getComponentName, getCurrentInstance } from "../component"
import { ComponentRenderContext } from '../componentPublicInstance';
import { RendererInternals } from '../renderer';


function getInnerChild(vnode) {
  return vnode.shapeFlag & ShapeFlags.SUSPENSE ? vnode.ssContent! : vnode
}
type MatchPattern = string | RegExp | (string | RegExp)[]

//匹配name是否在pattern中
function matches(pattern: MatchPattern, name: string) {
  if (isArray(pattern)) {
    return pattern.some((p: string | RegExp) => matches(p, name))
  } else if (isString(pattern)) {
    return pattern.split(',').indexOf(name) > -1
  } else if (pattern.test) {
    return pattern.test(name)
  }
  return false
}


export interface KeepAliveContext extends ComponentRenderContext {
  renderer: RendererInternals
  activate: (
    vnode: any,
    container: any,
    anchor: any,
  ) => void
  deactivate: (vnode: any) => void
}

export const KeepAliveImpl = {
  name: "KeepAlive",
  __isKeepAlive: true,
  props: {
    include: [RegExp, String, Array],
    exclude: [RegExp, String, Array],
    max: [String, Number], //TODO
  },
  setup(props, { slots }) {
    //创建一个缓存对象
    //key: vnode.type
    //value: vnode
    const cache = new Map()
    let current
    //当前KeepAlive组件实例
    const instance = getCurrentInstance()



    //对于KeepAlive组件来说，它的实例上存在一个特殊的keepAliveCtx对象，该对象由渲染器注入
    // 该对象会暴露渲染器的一些内部方法，其中move函数用来将一段DOM移动到另一个容器中
    const sharedContext = instance.ctx as KeepAliveContext
    const { renderer: { m: move, o: { createElement }
    } } = sharedContext


    //创建一个隐藏的容器用来存储‘卸载’了的组件
    const storageContainer = createElement('div')


    //KeepAlive组件实例上会被添加两个内部的函数，分别是_deActivate 和 _activate
    //这两个函数会在渲染器中调用
    sharedContext.deactivate = (vnode) => {
      move(vnode, storageContainer)
    }
    sharedContext.activate = (vnode, container, anchor) => {
      move(vnode, container, anchor)
    }


    return () => {
      if (!slots.default) {
        return null
      }


      //keepAlive的默认插槽就是要被keepAlive的组件
      const children = slots.default()
      const rawVNode = children[0]


      //如果长度大于1直接返回不支持，KeepAlive应该只包含一个子组件。  
      if (children.length > 1) {
        current = null
        return children
      } else if (!isVNode(rawVNode) || (!(rawVNode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) /**&& !(rawVNode.shapeFlag & ShapeFlags.SUSPENSE)**/)) {
        //如果不是组件直接渲染即可，因为非组件的虚拟节点无法被keepAlive
        //元素的虚拟节点无法被keepAlive
        current = null
        return rawVNode
      }



      let vnode = getInnerChild(rawVNode)
      const comp = vnode.type

      //组件名
      const name = getComponentName(isAsyncWrapper(comp) ? comp.__asyncResolved : comp)

      const { include, exclude, max } = props
      //处理include、exclude属性
      //如果include中的值和当前vnode Name匹配说明需要keepAlive
      //如果exclude中的值和当前vnode Name匹配说明不需要keepAlive
      //name不存在不需要keepAlive
      if (
        (include && (!name || !matches(include, name))) ||
        (exclude && name && matches(exclude, name))
      ) {
        current = null
        return rawVNode
      }

      //挂载时先获取缓存的组件vnode
      const cachedVNode = cache.get(rawVNode.type)
      if (cachedVNode) {
        //如果缓存中有内容，不应该执行挂载，而是进行激活
        //继承组件实例
        rawVNode.component = cachedVNode.component

        //在组件vnode shapeFlag上合并COMPONENT_KEEP_ALIVE，渲染器挂载时需要判断 。说明当前组件不需要被重新渲染
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
      } else {
        //缓存中没有就加入缓存,下次激活就不需要重新执行渲染
        cache.set(rawVNode.type, rawVNode)
      }

      // 在组件vnode shapeFlag上合并COMPONENT_SHOULD_KEEP_ALIVE，渲染器卸载时需要判断
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE

      // 将KeepAlive实例添加到vnode上，以便在渲染器中访问
      rawVNode.keepAliveInstance = instance

      //渲染
      current = vnode
      return rawVNode

    }
  }
}


export const KeepAlive = KeepAliveImpl as any