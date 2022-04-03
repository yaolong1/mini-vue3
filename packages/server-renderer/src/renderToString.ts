import { VNode, ssrUtils, createApp,createVNode } from 'mini-vue3';
import { renderComponentVNode } from './render'
const { isVNode } = ssrUtils
export function renderToString(input) {

  if (isVNode(input)) {
    //如果是vnode创建App实例
    return renderToString(createApp({ render: () => input }))
  }

  //创建vnode
  const vnode = createVNode(input._component,input._props)

  return renderComponentVNode(vnode)
}