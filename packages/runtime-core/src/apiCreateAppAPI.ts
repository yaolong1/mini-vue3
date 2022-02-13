import { createVNode } from "./createVNode"

export function createAppAPI(render) {
  return (rootComponent, rootProps) => {
    let isMounted = false
    const app = {
      mount(container) {
        //1. 创建组件的虚拟节点
        const vnode = createVNode(rootComponent, rootProps)
        console.log('将根组件变为vnode')
        //2. 挂载的核心就是根据传入的组件把它渲染成组件的虚拟接点，然后再将虚拟节点渲染到容器中
        render(vnode, container)

        if (!isMounted) {
          isMounted = true
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
