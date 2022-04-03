export { isKeepAlive } from './renderer'

export * from '@mini-vue3/reactivity'

export { createRenderer, createHydrationRenderer } from './renderer'
export { defineAsyncComponent } from './apiAsyncComponent'
export { defineComponent } from './apiDefineComponent'


export * from './apiLifecycle'

export { KeepAlive } from './components/KeepAlive'
export { Teleport } from './components/Teleport'
export { TransitionHooks, TransitionProps } from './components/BaseTransition'

export { VNode, Comment, Fragment, Text, normalizeVNode } from './vnode'

export { registerRuntimeCompiler, ComponentInternalInstance, Component, RuntimeCompilerOptions, Data, SetupContext } from './component'

//-------------------------------SSR-START------------------------------------------------
import { createComponentInstance, setupComponent } from './component'
import { renderComponentRoot } from './componentRenderUtils'
import { isVNode, normalizeVNode } from './vnode'

const _ssrUtils = {
  createComponentInstance,
  renderComponentRoot,
  setupComponent,
  isVNode,
  normalizeVNode
}
//vue源码会直接根据当前环境判断返回_ssrUtils，由于我们只有一个环境，就不需要判断是SSR环境还是CSR环境，直接返回即可
export const ssrUtils = _ssrUtils
//-------------------------------SSR-END------------------------------------------------

export { h } from './h'

export { watch } from './apiWatch'


export { toDisplayString } from '@mini-vue3/shared'
