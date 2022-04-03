import { createVNode } from "./vnode"


/**
 * 
 * @param render 客户端渲染器
 * @param hydrate 客户端激活器
 * @returns 
 */
export function createAppAPI(render, hydrate?) {
  return (rootComponent, rootProps) => {

    let isMounted = false
    const app = {
      mount(container, isHydrate?: boolean,) {
        if (!isMounted) {

          //1. 创建组件的虚拟节点
          const vnode = createVNode(rootComponent, rootProps)
          console.log('将根组件变为vnode')

          //如果是客户端激活
          if (isHydrate) {
            //激活客户端代码
            hydrate(vnode, container)
          } else {
            //2. 挂载的核心就是根据传入的组件把它渲染成组件的虚拟接点，然后再将虚拟节点渲染到容器中
            render(vnode, container)
          }

        }

      },
      use() { },
      directive() { },
      unmount() { },
      component() { },
      mixin() { },
      install() { },
    }
    return app
  }
}
