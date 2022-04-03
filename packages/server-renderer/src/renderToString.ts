import { VNode } from 'mini-vue3';
import { renderVNode } from './render'
export function renderToString(vnode: VNode) {
  return renderVNode(vnode)
}